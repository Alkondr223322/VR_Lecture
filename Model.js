

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


function Vertex(p)
{
    this.p = p;
    this.normal = [];
    this.triangles = [];
}

function Triangle(v0, v1, v2)
{
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [];
    this.tangent = [];
}

// Constructor
function Model(name, id) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, indices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
        gl.vertexAttribPointer(shProgram[`iAttribVertex${id}`], 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram[`iAttribVertex${id}`]);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STREAM_DRAW);
        //console.log(shProgram[`iAttribVertex${id}`])
        this.count = indices.length;
    }

    this.Draw = function() {

        //gl.drawArrays(gl.LINE_STRIP, 0, this.count);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }

    this.DrawWireframe = function() {

        for (let p=0; p<this.count; p+=3)                    // offset in bytes (UNSIGNED_SHORT is two bytes)
            gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, p*2);
    }
}


function CreateSurfaceData(data, step, heightIterCount)
{
    let vertices = [];
    let triangles = [];
    //let normals = [];
    let r1 = 0.5
    let r2 = 1
    let hMax = 1
    //let h = 1
    
    //let step = +document.getElementById("stepRange").value
    //console.log(step)
    let iterCount = Math.ceil(360/step)+1

    //let heightIterCount = +document.getElementById("step2Range").value 
    let heightStep = hMax / heightIterCount
    //console.log(heightStep)
    
    

    for (let i=0, ang = 0; i<iterCount; i++, ang+=step) {
        vertices.push( new Vertex( [r1 * Math.sin(deg2rad(ang)), 0, r1 * Math.cos(deg2rad(ang))] ));
        //vertices[vertices.length-1].normal = calculateNormal()
        vertices.push( new Vertex( [r2 * Math.sin(deg2rad(ang)), 0, r2 * Math.cos(deg2rad(ang))] ));
        //vertices[vertices.length-1].normal = calculateNormal()
        // FLOOR
        let v0ind = vertices.length-1;
        if (i > 0)
            {
                
                let v1ind = v0ind - 2;
                let v2ind = v0ind - 1
                let v3ind = v0ind - 3
    
                let trian = new Triangle(v0ind, v3ind, v2ind);
                let trianInd = triangles.length;
    
                triangles.push( trian );
                vertices[v0ind].triangles.push(trianInd);
                vertices[v1ind].triangles.push(trianInd);
                vertices[v3ind].triangles.push(trianInd);
    
                let trian2 = new Triangle(v3ind, v0ind, v1ind);
                let trianInd2 = triangles.length;
    
                triangles.push( trian2 );
                vertices[v0ind].triangles.push(trianInd2);
                vertices[v3ind].triangles.push(trianInd2);
                vertices[v1ind].triangles.push(trianInd2);
    
            }
    }
    for(let j = 0, h = heightStep; j < heightIterCount; j++, h+=heightStep){
    for (let i=0, ang = 0; i<iterCount; i++, ang+=step) {

        let v0ind = vertices.length -1;
       
        
        vertices.push( new Vertex( [r1 * Math.sin(deg2rad(ang)), h, r1 * Math.cos(deg2rad(ang))] ));
        //vertices[vertices.length-1].normal = calculateNormal()
        vertices.push( new Vertex( [r2 * Math.sin(deg2rad(ang)), h, r2 * Math.cos(deg2rad(ang))] )); 
        //vertices[vertices.length-1].normal = calculateNormal()

        // v0    v2 
        //   o - o
        //   | \ |
        //   o - o
        // v3     v1
       // CEILING
       v0ind+=2
       if (i > 0 && h == hMax)
           {
              
               let v1ind = v0ind - 2;
               let v2ind = v0ind - 1
               let v3ind = v0ind - 3
   
               let trian = new Triangle(v0ind, v3ind, v2ind);
               let trianInd = triangles.length;
   
               triangles.push( trian );
               vertices[v0ind].triangles.push(trianInd);
               vertices[v1ind].triangles.push(trianInd);
               vertices[v3ind].triangles.push(trianInd);
   
               let trian2 = new Triangle(v3ind, v0ind, v1ind);
               let trianInd2 = triangles.length;
   
               triangles.push( trian2 );
               vertices[v0ind].triangles.push(trianInd2);
               vertices[v3ind].triangles.push(trianInd2);
               vertices[v1ind].triangles.push(trianInd2);
   
           }
       //OUTER WALLS
       v0ind-=2
       if (i > 0)
       {
           let v1ind = v0ind - iterCount*2;
           let v2ind = v0ind + 2
           let v3ind = v0ind - iterCount*2 +2
           let trian = new Triangle(v0ind, v3ind, v2ind);
           let trianInd = triangles.length;

           triangles.push( trian );
           vertices[v0ind].triangles.push(trianInd);
           vertices[v1ind].triangles.push(trianInd);
           vertices[v3ind].triangles.push(trianInd);

           let trian2 = new Triangle(v3ind, v0ind, v1ind);
           let trianInd2 = triangles.length;

           triangles.push( trian2 );
           vertices[v0ind].triangles.push(trianInd2);
           vertices[v3ind].triangles.push(trianInd2);
           vertices[v1ind].triangles.push(trianInd2);

       }
       // INNER WALLS
       v0ind--
       if (i > 0) 
           {
               
               let v1ind = v0ind - iterCount*2;
               let v2ind = v0ind + 2
               let v3ind = v0ind - iterCount*2 +2
   
               let trian = new Triangle(v0ind, v3ind, v2ind);
               let trianInd = triangles.length;
   
               triangles.push( trian );
               vertices[v0ind].triangles.push(trianInd);
               vertices[v1ind].triangles.push(trianInd);
               vertices[v3ind].triangles.push(trianInd);
   
               let trian2 = new Triangle(v3ind, v0ind, v1ind);
               let trianInd2 = triangles.length;
   
               triangles.push( trian2 );
               vertices[v0ind].triangles.push(trianInd2);
               vertices[v3ind].triangles.push(trianInd2);
               vertices[v1ind].triangles.push(trianInd2);
   
           }
       
    }
    }
    
    data.verticesF32 = new Float32Array(vertices.length*3);
    for (let i=0, len=vertices.length; i<len; i++)
    {
        data.verticesF32[i*3 + 0] = vertices[i].p[0];
        data.verticesF32[i*3 + 1] = vertices[i].p[1];
        data.verticesF32[i*3 + 2] = vertices[i].p[2];
    }

    data.indicesU16 = new Uint16Array(triangles.length*3);
    for (let i=0, len=triangles.length; i<len; i++)
    {
        data.indicesU16[i*3 + 0] = triangles[i].v0;
        data.indicesU16[i*3 + 1] = triangles[i].v1;
        data.indicesU16[i*3 + 2] = triangles[i].v2;
    }
    //console.log(data)

}


function CreateSurfaceDataBall(data, latSteps = 10, lonSteps = 20) {
    let vertices = [];
    let triangles = [];

    const radius = 0.5;

    // Latitude: angle from top (0) to bottom (π)
    for (let i = 0; i <= latSteps; i++) {
        const theta = Math.PI * i / latSteps;
        const y = radius * Math.cos(theta);
        const r = radius * Math.sin(theta); // projected radius in XZ

        // Longitude: angle around the Y axis (0 to 2π)
        for (let j = 0; j <= lonSteps; j++) {
            const phi = 2 * Math.PI * j / lonSteps;
            const x = r * Math.cos(phi);
            const z = r * Math.sin(phi);

            vertices.push(new Vertex([x, y, z]));
        }
    }
    //console.log(vertices)
    // Connect vertices into triangles
    for (let i = 0; i < latSteps; i++) {
        for (let j = 0; j < lonSteps; j++) {
            const first = i * (lonSteps + 1) + j;
            const second = first + lonSteps + 1;

            // Triangle 1
            triangles.push(new Triangle(first, second, first + 1));
            vertices[first].triangles.push(triangles.length - 1);
            vertices[second].triangles.push(triangles.length - 1);
            vertices[first + 1].triangles.push(triangles.length - 1);

            // Triangle 2
            triangles.push(new Triangle(second, second + 1, first + 1));
            vertices[second].triangles.push(triangles.length - 1);
            vertices[second + 1].triangles.push(triangles.length - 1);
            vertices[first + 1].triangles.push(triangles.length - 1);
        }
    }

    // Output
    data.verticesF32 = new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i++) {
        data.verticesF32[i * 3 + 0] = vertices[i].p[0];
        data.verticesF32[i * 3 + 1] = vertices[i].p[1];
        data.verticesF32[i * 3 + 2] = vertices[i].p[2];
    }

    data.indicesU16 = new Uint16Array(triangles.length * 3);
    for (let i = 0; i < triangles.length; i++) {
        data.indicesU16[i * 3 + 0] = triangles[i].v0;
        data.indicesU16[i * 3 + 1] = triangles[i].v1;
        data.indicesU16[i * 3 + 2] = triangles[i].v2;
    }
}
