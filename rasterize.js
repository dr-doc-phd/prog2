/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/spheres.json"; // spheres file loc
var eyex = 0.5;
var eyey = 0.5;
var eyez = -0.5;
var Eye = new vec3.fromValues(eyex,eyey,eyez); // default eye position in world space
var at = new vec3.fromValues(0.5,0.5,0.0);
var up = new vec3.fromValues(0.0,1.0,0.0);
/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader
var vertexdiffuseColorAttrib;
var vertexspecularColorAttrib;
var vertexambientColorAttrib;
var vertexShineAttrib;
var vertexNormalAttrib;
var vertexIDAttribute;

var altPosition; // flag indicating whether to alter vertex positions
var altPositionUniform; // where to put altPosition flag for vertex shader
var translation;
var lightPosition;
var translationX = 0.0;
var translationY = 0.0;
var translationZ = 0.0;
var modelViewMatrix = mat4.lookAt([], Eye, at, up);
var modelViewMatrixLoc;
var projectionMatrix;
var projectionMatrixLoc;
var light = [1,1,1];
var lightloc = [-0.5,1.5,-0.5];

// ASSIGNMENT HELPER FUNCTIONS

//https://www.geertarien.com/blog/2017/07/16/overview-of-the-rendering-pipeline-in-webgl/
//https://www.geertarien.com/blog/2017/08/30/blinn-phong-shading-using-webgl/

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    var aspectRatio = gl.canvas.width / gl.canvas.height;
    const fov = 89.3;
    const near = 0.3;
    const far = 5;
    projectionMatrix = mat4.perspective([], fov, aspectRatio, near, far);
    const bodyElement = document.querySelector( "body" );




    bodyElement.addEventListener( "keydown", KeyDown, false );


    function KeyDown( event )
    {
        console.log( event );
        if ( "s" === event.key)
        {
            translationY -= 0.1;
            console.log(translationY);
        }
    }

    
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");

    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var whichSetColors;// index of colors in the current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        var indexArray = []; // 1D array of vertex indices for WebGL
        var vtxBufferSize = 0; // the number of vertices in the vertex buffer
        var vtxToAdd = []; // vtx coords to add to the coord array
        var indexOffset = vec3.create(); // the index offset for the current set
        var triToAdd = vec3.create(); // tri indices to add to the index array
        var diffusecolors = [];
        var diffusecolorsToAdd = [];
        var specularcolors = [];
        var specularcolorsToAdd = [];
        var ambientcolors = [];
        var ambientcolorsToAdd = [];
        var shinycolors = [];
        var objectIDs = [];
        var normalsToAdd = vec3.create();
        var ba = vec3.create();
        var ca = vec3.create();
        var normals = [];
        
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset
            
            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);

                diffusecolorsToAdd = inputTriangles[whichSet].material.diffuse;
                diffusecolors.push(diffusecolorsToAdd[0]*light[1],diffusecolorsToAdd[1]*light[1],diffusecolorsToAdd[2]*light[1],1.0);
                
                specularcolorsToAdd = inputTriangles[whichSet].material.specular;
                specularcolors.push(specularcolorsToAdd[0]*light[2],specularcolorsToAdd[1]*light[2],specularcolorsToAdd[2]*light[2],1.0);
                
                ambientcolorsToAdd = inputTriangles[whichSet].material.ambient;
                ambientcolors.push(ambientcolorsToAdd[0],ambientcolorsToAdd[1],ambientcolorsToAdd[2],1.0);
                
                shinycolors.push(inputTriangles[whichSet].material.n);
                objectIDs.push(whichSet);

                vec3.cross(normalsToAdd, 
                    vec3.sub(ba,inputTriangles[whichSet].vertices[0],inputTriangles[whichSet].vertices[1]),
                    vec3.sub(ca,inputTriangles[whichSet].vertices[0],inputTriangles[whichSet].vertices[2]));
                normals.push(normalsToAdd[0],normalsToAdd[1],normalsToAdd[2]);


            } // end for vertices in set
            
            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set

            

            vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            triBufferSize += inputTriangles[whichSet].triangles.length; // total number of tris
        } // end for each triangle set 
        triBufferSize *= 3; // now total number of indices

        // send the vertex coords to webGL
        vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
        
        // send the triangle indices to webGL
        triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer

        

        diffusecolorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, diffusecolorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(diffusecolors), gl.STATIC_DRAW);

        specularcolorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, specularcolorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(specularcolors), gl.STATIC_DRAW);

        ambientcolorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ambientcolorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ambientcolors), gl.STATIC_DRAW);

        shinycolorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, shinycolorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(shinycolors), gl.STATIC_DRAW);

        normalsBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW); // indices to that buffer

        objectIDsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, objectIDsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(objectIDs), gl.STATIC_DRAW);

    } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float;
        varying vec4 theVertextdiffuseColor;
        varying vec4 theVertextspecularColor;
        varying vec4 theVertextambientColor;
        varying float theVertextShine;
        varying vec3 L, N, E;



        void main(void) {
            
            vec4 diffuse = abs(dot(L, N)) * theVertextdiffuseColor;
            vec3 H = normalize(L+E);
            vec4 specular =
              pow(abs(dot(N, H)), theVertextShine) * theVertextspecularColor;
        
            if (dot(L, N) < 0.0)
              specular = vec4(0.0, 0.0, 0.0, 1.0);
        
            vec4 fColor = theVertextambientColor + diffuse + specular;
            
            gl_FragColor = fColor;
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        precision mediump float;
        attribute vec3 vertexPosition;
        attribute vec3 aVertextNormal;
        attribute vec4 aVertextdiffuseColor;
        attribute vec4 aVertextspecularColor;
        attribute vec4 aVertextambientColor;
        attribute float aVertextShine;
        attribute float vertexIDAttribute;
        varying vec4 theVertextdiffuseColor;
        varying vec4 theVertextspecularColor;
        varying vec4 theVertextambientColor;
        varying float theVertextShine;
        varying lowp vec3 L,N,E;

        uniform vec3 translation;
        uniform vec3 lightPosition;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        

        void main(void) {
            
            
            vec3 pos = (modelViewMatrix * vec4(vertexPosition, 1.0)).xyz;
            vec3 lightPos = (modelViewMatrix * vec4(lightPosition, 1.0)).xyz;
            
            
       
            L = normalize(lightPos - pos);
            N = normalize((modelViewMatrix * vec4(aVertextNormal, 1.0)).xyz);
            E = -normalize(pos);

            gl_Position = projectionMatrix*modelViewMatrix*vec4(vertexPosition + translation, 1.0); // use the untransformed position

            theVertextdiffuseColor = aVertextdiffuseColor;
            theVertextspecularColor = aVertextspecularColor;
            
            theVertextShine = aVertextShine;

           
            theVertextambientColor = aVertextambientColor;
            
            
            
        }
    `;
    
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
                
                vertexdiffuseColorAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "aVertextdiffuseColor"); 
                gl.enableVertexAttribArray(vertexdiffuseColorAttrib); // input to shader from array

                vertexspecularColorAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "aVertextspecularColor"); 
                gl.enableVertexAttribArray(vertexspecularColorAttrib); // input to shader from array

                vertexambientColorAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "aVertextambientColor"); 
                gl.enableVertexAttribArray(vertexambientColorAttrib); // input to shader from array

                vertexNormalAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "aVertextNormal"); 
                gl.enableVertexAttribArray(vertexNormalAttrib); // input to shader from array

                vertexShineAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "aVertextShine"); 
                gl.enableVertexAttribArray(vertexShineAttrib); // input to shader from array
                
                vertexIDAttribute = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexIDAttribute"); 
                gl.enableVertexAttribArray(vertexIDAttribute); // input to shader from array


                
                translation = 
                    gl.getUniformLocation(shaderProgram, "translation" );
                lightPosition = 
                    gl.getUniformLocation(shaderProgram, "lightPosition" );
                modelViewMatrixLoc = 
                    gl.getUniformLocation(shaderProgram, "modelViewMatrix");
                projectionMatrixLoc = 
                    gl.getUniformLocation( shaderProgram, "projectionMatrix" );
                
                
                


            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
    altPosition = false;
    // setTimeout(function alterPosition() {
    //     altPosition = !altPosition;
    //     setTimeout(alterPosition, 2000);
    // }, 2000); // switch flag value every 2 seconds
} // end setup shaders

// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    requestAnimationFrame(renderTriangles);
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    gl.uniform3f(translation, translationX, translationY, translationZ);
    gl.uniform3f(lightPosition, lightloc[0],lightloc[1],lightloc[2]);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, modelViewMatrix);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, projectionMatrix);
    //console.log(translation);
    // color buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,diffusecolorBuffer); // activate
    gl.vertexAttribPointer(vertexdiffuseColorAttrib,4,gl.FLOAT,false,0,0); // feed
    
    gl.bindBuffer(gl.ARRAY_BUFFER,specularcolorBuffer); // activate
    gl.vertexAttribPointer(vertexspecularColorAttrib,4,gl.FLOAT,false,0,0); // feed
    
    gl.bindBuffer(gl.ARRAY_BUFFER,ambientcolorBuffer); // activate
    gl.vertexAttribPointer(vertexambientColorAttrib,4,gl.FLOAT,false,0,0); // feed

    gl.bindBuffer(gl.ARRAY_BUFFER,shinycolorBuffer); // activate
    gl.vertexAttribPointer(vertexShineAttrib,1,gl.UNSIGNED_BYTE,false,0,0); // feed

    gl.bindBuffer(gl.ARRAY_BUFFER,objectIDsBuffer); // activate
    gl.vertexAttribPointer(vertexIDAttribute,1,gl.UNSIGNED_BYTE,false,0,0); // feed

    gl.bindBuffer(gl.ARRAY_BUFFER,normalsBuffer); // activate
    gl.vertexAttribPointer(vertexNormalAttrib,3,gl.FLOAT,false,0,0); // feed

    

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer);
    gl.drawElements(gl.TRIANGLES,triBufferSize,gl.UNSIGNED_SHORT,0);
} // end render triangles


/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
  
} // end main
