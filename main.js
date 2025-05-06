'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let surfaceWebCam;              // A substrate for webcam image
let shProgram;                  // A shader program
//let bgProgram;
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let stereoCam;                  // Object holding stereo camera and its parameters

let iTextureWebCam = -1;
let step1 = 15;
let step2 = 1;
let video;
let webcamElement;
let videoTexture
var sound = {};
var ctx = new AudioContext();
const renderingParams = {
	eyeSeparation: 0.1,
	fov: 30 *Math.PI / 180,
	nearClip: 8.0,
	convergence: 8.7,
};

let phoneX = 0;
let phoneY = 0;
 
// Websocket stuff

const WS_URL = "ws://192.168.0.177:8080/sensor/connect?type=android.sensor.device_orientation";

let socket;
let reconnectInterval = 3000; 

function connectWebSocket() {
  console.log("Attempting to connect...");

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("WebSocket connection established.");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log(data)
      let orientationState = parseFloat(data.values?.[0]);

      if (!isNaN(orientationState)) {
        if(orientationState == -1){
            phoneX = 0;
            phoneY = 0
        }else if(orientationState == 0){
            phoneX = 0
            phoneY = 2
        }else if(orientationState == 1){
            phoneX = -2
            phoneY = 0
        }else if(orientationState == 2){
            phoneX = 0
            phoneY = -2
        }else if(orientationState == 3){
            phoneX = 2
            phoneY = 0
        }
        sound.panner.positionX.setValueAtTime(phoneX, ctx.currentTime);
        sound.panner.positionY.setValueAtTime(phoneY, ctx.currentTime);
        sound.panner.positionZ.setValueAtTime(0, ctx.currentTime);
        console.log("Data: ", data);
      } else {
        console.warn("Invalid angle in message:", data);
      }
    } catch (err) {
      console.error("Error parsing message:", err);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = (event) => {
    console.warn("WebSocket closed. Reconnecting in 3 seconds...", event.reason);
    setTimeout(connectWebSocket, reconnectInterval);
  };
}

// Start connection
connectWebSocket();


// Constructor
function ShaderProgram(name, program, bgProgram, videoProg) {

    this.name = name;
    this.prog = program;
    this.bgProgram = bgProgram
    this.videoProg = videoProg
    // Location of the attribute variable in the shader program.
    this.iAttribVertex1 = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor1 = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix1 = -1;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex2 = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor2 = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix2 = -1;

    this.Use = function(progType) {
        if(progType == 'main'){
            gl.useProgram(this.prog);
        }
        if(progType == 'background'){
            gl.useProgram(this.bgProgram);
        }
        if(progType == 'video'){
            gl.useProgram(this.videoProg);
        }
    }
}

async function initWebcam() {
	webcamElement = document.getElementById("webcam");
	try {
		const stream = await navigator.mediaDevices.getUserMedia({ video: true });
		webcamElement.srcObject = stream;

		// Create and set up video texture
		videoTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, videoTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        initBackgroundShaders()
	} catch (error) {
		console.error("Error accessing webcam:", error);
	}
}



function drawVideoBackground() {
    if (!shProgram || !shProgram.videoProg) {
        initBackgroundShaders();
    }

    shProgram.Use('video')

    // Set up a simple quad for the background
    const vertices = new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]);

    const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);

    // Create and bind buffers
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    //Set up attributes
    const positionLoc = gl.getAttribLocation(
        shProgram.videoProg,
        "position",
    );
    const texCoordLoc = gl.getAttribLocation(
        shProgram.videoProg,
        "texCoord",
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    // Update texture
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        webcamElement,
    );

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Switch back to main program
    shProgram.Use('main')
}


function initBackgroundShaders() {
    const backgroundVertexShader = `
        attribute vec3 vertex2;
        uniform mat4 ModelViewMatrix2;
        uniform mat4 ProjectionMatrix2;

        void main() {
            gl_Position = ProjectionMatrix2 * ModelViewMatrix2 * vec4(vertex2, 1.0);
        }
    `;

    const backgroundFragmentShader = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
            precision highp float;
        #else
            precision mediump float;
        #endif

        uniform vec4 color2;
        void main() {
            gl_FragColor = color2;
        }
    `;
    
    const videoVertexShader = `
        attribute vec2 position;
        attribute vec2 texCoord;
        varying vec2 vTexCoord;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
            vTexCoord = texCoord;
        }
    `;

    const videoFragmentShader = `
        precision mediump float;
        uniform sampler2D uTexture;
        varying vec2 vTexCoord;
        void main() {
            gl_FragColor = texture2D(uTexture, vTexCoord);
        }
    `;
    
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );
    let progbg = createProgram( gl, backgroundVertexShader, backgroundFragmentShader );
    let progvid = createProgram( gl, videoVertexShader, videoFragmentShader );
    shProgram = new ShaderProgram('Basic', prog, progbg, progvid);
    console.log(shProgram)
    //shProgram.Use('background')
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */

function drawCylinderBackground() {

    shProgram.Use('background')
    
    // TODO: Place your code here to draw webCam surface
    // Draw background video if available
    let data = {};
    
    CreateSurfaceData(data, step1, step2)

    surface = new Model('Surface', 2);
    surface.BufferData(data.verticesF32, data.indicesU16);
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0);
    let rotateByPhone = m4.axisRotation([0,0,1], 0)
    let translateToPointZero = m4.translation(0,-0.5,-10);

    const colorPolygon = new Float32Array([0.5,0.5,0.5,1]);
    const colorEdge    = new Float32Array([1,1,1,1]);

    // The FIRST PASS (for the left eye)

    let matrLeftFrustum = stereoCam.calcLeftFrustum();
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix2, false, matrLeftFrustum);

    let translateLeftEye = m4.translation(stereoCam.eyeSeparation/2, 0, 0);

    let rotatedModelView = m4.multiply(rotateByPhone, modelView)
    let matAccum0 = m4.multiply(rotateToPointZero, rotatedModelView );
    let matAccum1 = m4.multiply(translateLeftEye, matAccum0 );
    let matAccum2 = m4.multiply(translateToPointZero, matAccum1 );
        
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix2, false, matAccum2 );


    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1,0);
    
    gl.colorMask(true, true, true, true);
    gl.uniform4fv(shProgram.iColor2, colorPolygon );
    surface.Draw();
    gl.uniform4fv(shProgram.iColor2, colorEdge );
    surface.DrawWireframe();

    // RESET specific params to their default state

    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.colorMask(true, true, true, true);
    //console.log(shProgram)
    // Switch back to main program
    shProgram.Use('main')
}

function draw() { 
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // PATH ZERO: DRAW ZERO PARALLAX WEBCAM


    let matrOrth = m4.orthographic(0,1,0,1, 8,20);
    
    // TODO: Place your code here to draw webCam surface
    // Draw background video if available
	drawVideoBackground();
    drawCylinderBackground();
    let data = {};
    
    CreateSurfaceDataBall(data)

    surface = new Model('Surface', 1);
    surface.BufferData(data.verticesF32, data.indicesU16);
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0);
    let rotateByPhone = m4.axisRotation([0,0,1], 0)
    let translateToPointZero = m4.translation(phoneX,phoneY,-10);

    const colorPolygon = new Float32Array([0.5,0.5,0.5,1]);
    const colorEdge    = new Float32Array([1,1,1,1]);

    // The FIRST PASS (for the left eye)

    let matrLeftFrustum = stereoCam.calcLeftFrustum();
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix1, false, matrLeftFrustum);

    let translateLeftEye = m4.translation(stereoCam.eyeSeparation/2, 0, 0);

    let rotatedModelView = m4.multiply(rotateByPhone, modelView)
    let matAccum0 = m4.multiply(rotateToPointZero, rotatedModelView );
    let matAccum1 = m4.multiply(translateLeftEye, matAccum0 );
    let matAccum2 = m4.multiply(translateToPointZero, matAccum1 );
        
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix1, false, matAccum2 );

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1,0);
    
    gl.colorMask(true, true, true, true);
    gl.uniform4fv(shProgram.iColor1, colorPolygon );
    surface.Draw();
    gl.uniform4fv(shProgram.iColor1, colorEdge );
    surface.DrawWireframe();

    // RESET specific params to their default state

    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.colorMask(true, true, true, true);
    //console.log(shProgram)
}



/* Initialize the WebGL context. Called from init() */
function initGL() {
    shProgram.Use('background');

    shProgram.iAttribVertex2              = gl.getAttribLocation(shProgram.bgProgram, "vertex2");
    shProgram.iModelViewMatrix2           = gl.getUniformLocation(shProgram.bgProgram, "ModelViewMatrix2");
    shProgram.iProjectionMatrix2          = gl.getUniformLocation(shProgram.bgProgram, "ProjectionMatrix2");
    shProgram.iColor2                     = gl.getUniformLocation(shProgram.bgProgram, "color2");
    
    shProgram.Use('main');

    shProgram.iAttribVertex1              = gl.getAttribLocation(shProgram.prog, "vertex");
    shProgram.iModelViewMatrix1           = gl.getUniformLocation(shProgram.prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix1          = gl.getUniformLocation(shProgram.prog, "ProjectionMatrix");
    shProgram.iColor1                     = gl.getUniformLocation(shProgram.prog, "color");



    //surfaceWebCam = new Model('SurfaceWebCam');
    // TODO: Place your code here to load two triangle geomtery


    stereoCam = new StereoCamera(
        renderingParams.eyeSeparation,     // decimeters
        renderingParams.convergence,   // decimeters
        1.3,    // aspect ratio of canvas
        renderingParams.fov,    // radians
        renderingParams.nearClip,    // decimeters
        20.0    // decimeters
    );

    gl.enable(gl.DEPTH_TEST);
}


function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
async function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        await initWebcam();
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    

    setInterval(draw, 1/20);

    spaceball = new TrackballRotator(canvas, draw, 0);
    LoadAudio();
    draw();
}


function LoadAudio()
{
    sound.source = ctx.createBufferSource();
    sound.mainVolume = ctx.createGain();
    sound.mainVolume.gain.setValueAtTime(0.05, ctx.currentTime); 
    sound.biquadFilter = ctx.createBiquadFilter();

    sound.biquadFilter.type = "bandpass";
    sound.biquadFilter.frequency.value = 500;   

    sound.source.connect(sound.mainVolume);
    sound.mainVolume.connect(sound.biquadFilter);
    sound.biquadFilter.connect(ctx.destination);

    var request = new XMLHttpRequest();

    request.open("GET", "music.mp3", true);
    request.responseType = "arraybuffer";
    
    request.onload = function (e) {
        ctx.decodeAudioData(this.response, function onSuccess(buffer) {
            sound.buffer = buffer;
            sound.source.buffer = buffer;
            sound.source.start(ctx.currentTime); 
        });
    };
    
    request.send();
    sound.panner = ctx.createPanner();
    sound.mainVolume.connect(sound.panner);
    sound.panner.connect(ctx.destination);



}