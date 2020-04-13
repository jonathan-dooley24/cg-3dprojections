var view;
var ctx;
var scene;
var start_time;

//for clipping
var LEFT = 32;
var RIGHT = 16;
var BOTTOM = 8;
var TOPP = 4;
var NEAR = 2;
var FAR = 1;

// Initialization function - called when web page loads
function Init() {
    var w = 800;
    var h = 600;
    view = document.getElementById('view');
    view.width = w;
    view.height = h;

    ctx = view.getContext('2d');

    // initial scene... feel free to change this
    scene = {
        view: {
            type: 'perspective',
            prp: Vector3(44, 20, -16),
            srp: Vector3(20, 20, -40),
            vup: Vector3(0, 1, 0),
            clip: [-19, 5, -10, 8, 12, 100]
        },
        models: [
            {
                type: 'generic',
                vertices: [
                    Vector4( 0,  0, -30, 1),
                    Vector4(20,  0, -30, 1),
                    Vector4(20, 12, -30, 1),
                    Vector4(10, 20, -30, 1),
                    Vector4( 0, 12, -30, 1),
                    Vector4( 0,  0, -60, 1),
                    Vector4(20,  0, -60, 1),
                    Vector4(20, 12, -60, 1),
                    Vector4(10, 20, -60, 1),
                    Vector4( 0, 12, -60, 1)
                ],
                edges: [
                    [0, 1, 2, 3, 4, 0],
                    [5, 6, 7, 8, 9, 5],
                    [0, 5],
                    [1, 6],
                    [2, 7],
                    [3, 8],
                    [4, 9]
                ],
                matrix: new Matrix(4, 4)
            }
        ]
    };

    

    // event handler for pressing arrow keys
    document.addEventListener('keydown', OnKeyDown, false);
    
    // start animation loop
    start_time = performance.now(); // current timestamp in milliseconds
    window.requestAnimationFrame(Animate);
}

// Animation loop - repeatedly calls rendering code
function Animate(timestamp) {
    // step 1: calculate time (time since start) 
    // step 2: transform models based on time
    // step 3: draw scene
    // step 4: request next animation frame (recursively calling same function)


    var time = timestamp - start_time;

    // ... step 2

    DrawScene();

   // window.requestAnimationFrame(Animate);
}

// Main drawing code - use information contained in variable `scene`
function DrawScene() { 
    // by the time we get here, just dealing with vertices
    // Step 0: Clear the screen so a new scene can be drawn
    ctx.clearRect(0, 0, view.width, view.height);

    // Step 1: Transform models into canonical view volume using matrix functions in transforms.js
    var vertex_array = []; // array of arrays containing each model's transformed vertices
    var near = scene.view.clip[4]; // near clipping plane
    var far = scene.view.clip[5]; // far clipping plane
    var view_window_matrix = new Matrix(4,4); // matrix for projecting onto view plane
    view_window_matrix.values = [[view.width/2, 0, 0, view.width/2], [0, view.height/2, 0, view.height/2], [0, 0, 1, 0], [0, 0, 0, 1]];
    var zmin = -near/far;
    var Mper = new Matrix(4, 4);
    var Mpar = new Matrix(4, 4);
    Mat4x4MPer(Mper);
    Mat4x4MPar(Mpar);
    if (scene.view.type == 'perspective') {
        for (let i = 0; i < scene.models.length; i++) {
            // for every model, scene.models.matrix should have appropriate Nper matrix
            Mat4x4Projection(scene.models[i].matrix, scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
            vertex_array.push([]); // push a blank array, populate with a model's transformed vertices

            for (let j = 0; j < scene.models[i].vertices.length; j++) {
                var transform = Matrix.multiply([scene.models[i].matrix, scene.models[i].vertices[j]]);
                vertex_array[i].push(transform);
            }
        } // at this point we have vertex_array populated with the transformed vertices
        // values are -1 to 1 if inside canonical view volume

        // Step 2: For every line, Clip using Cohen-Sutherland 3D clipping for Parallel or Perspective
        // once transformed (as done above), do clipping
        for (let i = 0; i < scene.models.length; i++) {
            for (let j = 0; j < scene.models[i].edges.length; j++) {
                for (let k = 0; k < (scene.models[i].edges[j].length)-1; k++) {
                    var spot1 = scene.models[i].edges[j][k]; // index in vertex list
                    var spot2 = scene.models[i].edges[j][k+1]; // index in vertex list
                    var line_point1 = vertex_array[i][spot1]; // one endpoint of line to check
                    var line_point2 = vertex_array[i][spot2]; // other endpoint of line to check
                    var pending_line = clipLinePerspective(line_point1, line_point2, zmin);
                    

                     // if any portion of the line still exists in canonical view volume, project and draw
                     if(pending_line != null) {
                         // Step 2.1: Project line onto view plane
                         // Step 2.2: Draw the line
                         console.log ("pending line not null: ")
                         console.log(pending_line);
                         pending_line.pt0 = Matrix.multiply([Mper, pending_line.pt0]);
                         pending_line.pt1 = Matrix.multiply([Mper, pending_line.pt1]);
                         pending_line.pt0 = Matrix.multiply([view_window_matrix, pending_line.pt0]);
                         pending_line.pt1 = Matrix.multiply([view_window_matrix, pending_line.pt1]);
                         DrawLine(pending_line.pt0.x/pending_line.pt0.w, pending_line.pt0.y/pending_line.pt0.w, pending_line.pt1.x/pending_line.pt1.w, pending_line.pt1.y/pending_line.pt1.w);
                     }
                }
            }
        }
    }
    else { // scene.view.type == 'parallel'
    for (let i = 0; i < scene.models.length; i++) {
        // for every model, scene.models.matrix should have appropriate Npar matrix
        Mat4x4Parallel(scene.models[i].matrix, scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
        vertex_array.push([]); // push a blank array, populate with a model's transformed vertices

        for (let j = 0; j < scene.models[i].vertices.length; j++) {
            var transform = Matrix.multiply([scene.models[i].matrix, scene.models[i].vertices[j]]);
            vertex_array[i].push(transform);
        }
        console.log(scene.models[i].matrix);
    } // at this point we have vertex_array populated with the transformed vertices
    // values are -1 to 1 if inside canonical view volume

    // Step 2: For every line, Clip using Cohen-Sutherland 3D clipping for Parallel or Perspective
    // once transformed (as done above), do clipping
    for (let i = 0; i < scene.models.length; i++) {
        for (let j = 0; j < scene.models[i].edges.length; j++) {
            for (let k = 0; k < (scene.models[i].edges[j].length)-1; k++) {
                var spot1 = scene.models[i].edges[j][k]; // index in vertex list
                var spot2 = scene.models[i].edges[j][k+1]; // index in vertex list
                var line_point1 = vertex_array[i][spot1]; // one endpoint of line to check
                var line_point2 = vertex_array[i][spot2]; // other endpoint of line to check
                var pending_line = clipLineParallel(line_point1, line_point2);
                

                 // if any portion of the line still exists in canonical view volume, project and draw
                 if(pending_line != null) {
                     // Step 2.1: Project line onto view plane
                     // Step 2.2: Draw the line
                     console.log ("pending line not null: ")
                     console.log(pending_line);
                     pending_line.pt0 = Matrix.multiply([Mpar, pending_line.pt0]);
                     pending_line.pt1 = Matrix.multiply([Mpar, pending_line.pt1]);
                     pending_line.pt0 = Matrix.multiply([view_window_matrix, pending_line.pt0]);
                     pending_line.pt1 = Matrix.multiply([view_window_matrix, pending_line.pt1]);
                     DrawLine(pending_line.pt0.x/pending_line.pt0.w, pending_line.pt0.y/pending_line.pt0.w, pending_line.pt1.x/pending_line.pt1.w, pending_line.pt1.y/pending_line.pt1.w);
                 }
            }
        }
    }
    }
}

    

// Called when user selects a new scene JSON file
function LoadNewScene() {
    var scene_file = document.getElementById('scene_file');

    console.log(scene_file.files[0]);

    var reader = new FileReader();
    reader.onload = (event) => {
        scene = JSON.parse(event.target.result);
        scene.view.prp = Vector3(scene.view.prp[0], scene.view.prp[1], scene.view.prp[2]);
        scene.view.srp = Vector3(scene.view.srp[0], scene.view.srp[1], scene.view.srp[2]);
        scene.view.vup = Vector3(scene.view.vup[0], scene.view.vup[1], scene.view.vup[2]);

        for (let i = 0; i < scene.models.length; i++) {
            if (scene.models[i].type === 'generic') {
                for (let j = 0; j < scene.models[i].vertices.length; j++) {
                    scene.models[i].vertices[j] = Vector4(scene.models[i].vertices[j][0],
                                                          scene.models[i].vertices[j][1],
                                                          scene.models[i].vertices[j][2],
                                                          1);
                }
            }
            else { // else if type is cube, cylinder, etc
                scene.models[i].center = Vector4(scene.models[i].center[0],
                                                 scene.models[i].center[1],
                                                 scene.models[i].center[2],
                                                 1);
            }
            scene.models[i].matrix = new Matrix(4, 4);
        }
    };
    reader.readAsText(scene_file.files[0], "UTF-8");
}

// Called when user presses a key on the keyboard down 
// translate prp and srp along u or n-axis
function OnKeyDown(event) {
    var n = scene.view.prp.subtract(scene.view.srp);
    n.normalize();
    var u = scene.view.vup.cross(n);
    u.normalize();
    var v = n.cross(u);
    var vrc = {n: n, u: u, v: v};
    // apply translate to prp and srp
    // determine x, y, z
    // u is some x, y, z because its a vector
    // query vector: how much in each direction
    switch (event.keyCode) {
        case 37: // LEFT Arrow
            console.log("left");
            var translateMatrix = new Matrix(4,4);
            var prp4 = Vector4(scene.view.prp.x, scene.view.prp.y, scene.view.prp.z, 1);
            Mat4x4Translate(translateMatrix, -u.x, -u.y, -u.z);
            var finalprp = Matrix.multiply([translateMatrix, prp4]);
            scene.view.prp.x = finalprp.x;
            scene.view.prp.y = finalprp.y;
            scene.view.prp.z = finalprp.z;
            var srp4 = Vector4(scene.view.srp.x, scene.view.srp.y, scene.view.srp.z, 1);
            var finalsrp = Matrix.multiply([translateMatrix, srp4]);
            scene.view.srp.x = finalsrp.x;
            scene.view.srp.y = finalsrp.y;
            scene.view.srp.z = finalsrp.z;
            DrawScene();
            break;
        case 38: // UP Arrow, FORWARD
            console.log("up");
            var translateMatrix = new Matrix(4,4);
            var prp4 = Vector4(scene.view.prp.x, scene.view.prp.y, scene.view.prp.z, 1);
            Mat4x4Translate(translateMatrix, n.x, n.y, n.z);
            var finalprp = Matrix.multiply([translateMatrix, prp4]);
            scene.view.prp.x = finalprp.x;
            scene.view.prp.y = finalprp.y;
            scene.view.prp.z = finalprp.z;
            var srp4 = Vector4(scene.view.srp.x, scene.view.srp.y, scene.view.srp.z, 1);
            var finalsrp = Matrix.multiply([translateMatrix, srp4]);
            scene.view.srp.x = finalsrp.x;
            scene.view.srp.y = finalsrp.y;
            scene.view.srp.z = finalsrp.z;
            DrawScene();
            break;
        case 39: // RIGHT Arrow
            console.log("right");
            var translateMatrix = new Matrix(4,4);
            var prp4 = Vector4(scene.view.prp.x, scene.view.prp.y, scene.view.prp.z, 1);
            Mat4x4Translate(translateMatrix, u.x, u.y, u.z);
            var finalprp = Matrix.multiply([translateMatrix, prp4]);
            scene.view.prp.x = finalprp.x;
            scene.view.prp.y = finalprp.y;
            scene.view.prp.z = finalprp.z;
            var srp4 = Vector4(scene.view.srp.x, scene.view.srp.y, scene.view.srp.z, 1);
            var finalsrp = Matrix.multiply([translateMatrix, srp4]);
            scene.view.srp.x = finalsrp.x;
            scene.view.srp.y = finalsrp.y;
            scene.view.srp.z = finalsrp.z;
            DrawScene();
            break;
        case 40: // DOWN Arrow, BACK
            console.log("down");
            var translateMatrix = new Matrix(4,4);
            var prp4 = Vector4(scene.view.prp.x, scene.view.prp.y, scene.view.prp.z, 1);
            Mat4x4Translate(translateMatrix, -n.x, -n.y, -n.z);
            var finalprp = Matrix.multiply([translateMatrix, prp4]);
            scene.view.prp.x = finalprp.x;
            scene.view.prp.y = finalprp.y;
            scene.view.prp.z = finalprp.z;
            var srp4 = Vector4(scene.view.srp.x, scene.view.srp.y, scene.view.srp.z, 1);
            var finalsrp = Matrix.multiply([translateMatrix, srp4]);
            scene.view.srp.x = finalsrp.x;
            scene.view.srp.y = finalsrp.y;
            scene.view.srp.z = finalsrp.z;
            DrawScene();
    }
}

// Draw black 2D line with red endpoints 
function DrawLine(x1, y1, x2, y2) {
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
    ctx.fillRect(x2 - 2, y2 - 2, 4, 4);
}

function clipLineParallel(pt0, pt1) {
    var done = false;
	var line = null;
	var endpt0 = new Vector4(pt0.x, pt0.y, pt0.z, pt0.w);
    var endpt1 = new Vector4(pt1.x, pt1.y, pt1.z, pt1.w);
    console.log(endpt0, endpt1);
    var outcode0, outcode1, selected_point, selected_outcode, t;
    var deltax = endpt1.x - endpt0.x;
    var deltay = endpt1.y - endpt0.y;
    var deltaz = endpt1.z - endpt0.z;
    console.log(deltax, deltay, deltaz);
    var loops = 0;
    
	while (!done) {
        // t sometimes gets infinitely close to 0 and the for loop never wants to exit
        outcode0 = outcodeParallel(endpt0);
        outcode1 = outcodeParallel(endpt1);
        console.log(outcode0, outcode1);
        if ((outcode0 | outcode1) === 0) {
            console.log("trivial accept"); // trivial accept
			done = true;
            line = {pt0: endpt0, pt1: endpt1};
            break;
		}
		else if ((outcode0 & outcode1) !== 0) {
            console.log("trivial reject"); // trivial reject
            done = true;
            break;
		}
		else {
            console.log("investigating further");
			// choose endpoint that is outside view
			if (outcode0 !== 0) {
                selected_point = endpt0;
                selected_outcode = outcode0;
			}
			else {
                selected_point = endpt1;
                selected_outcode = outcode1;
			}
			// calculate t (for intersection point with corresponding plane)
			if (selected_outcode & LEFT) {
                //t = ;
			}
			else if (selected_outcode & RIGHT) {
                t = (selected_point.x + selected_point.z) / (-deltax - deltaz);
			}
			else if (selected_outcode & BOTTOM) {
                t = (-selected_point.y + selected_point.z) / (deltay - deltaz);
			}
			else if (selected_outcode & TOPP) {
                t = (selected_point.y + selected_point.z) / (-deltay - deltaz);
            }
            else if (selected_outcode & NEAR) {
                t = (selected_point.z - zmin) / -deltaz;
            }
            else { // if (selected_outcode & FAR)
                t = (-selected_point.z - 1) / deltaz;
            }
			
			// replace selected endpoint with intersection point
			if (selected_outcode === outcode0) {
				endpt0.x = endpt0.x + t * (endpt1.x - endpt0.x);
                endpt0.y = endpt0.y + t * (endpt1.y - endpt0.y);
                endpt0.z = endpt0.z + t * (endpt1.z - endpt0.z);
			}
			else {
				endpt1.x = endpt1.x + t * (endpt1.x - endpt0.x);
                endpt1.y = endpt1.y + t * (endpt1.y - endpt0.y);
                endpt1.z = endpt1.z + t * (endpt1.z - endpt0.z);
            }
            line = {pt0: endpt0, pt1: endpt1};
        }
        loops++;
        if (loops > 5) {
            // sometimes the loop gets stuck with t being really close to 0, so this should stop that
            done = true;
        }
    }
	return line;
}


function clipLinePerspective(pt0, pt1, zmin) { // create new copy of line that's the clipped version
	var done = false;
	var line = null;
	var endpt0 = new Vector4(pt0.x, pt0.y, pt0.z, pt0.w);
    var endpt1 = new Vector4(pt1.x, pt1.y, pt1.z, pt1.w);
    console.log(endpt0, endpt1);
    var deltax = endpt1.x - endpt0.x;
    var deltay = endpt1.y - endpt0.y;
    var deltaz = endpt1.z - endpt0.z;
    var outcode0, outcode1, selected_point, selected_outcode, t;
    var loops = 0;
    
	while (!done) {
        // t sometimes gets infinitely close to 0 and the for loop never wants to exit
        outcode0 = outcodePerspective(endpt0, zmin);
        outcode1 = outcodePerspective(endpt1, zmin);
        if ((outcode0 | outcode1) === 0) { // trivial accept
			done = true;
            line = {pt0: endpt0, pt1: endpt1};
            break;
		}
		else if ((outcode0 & outcode1) !== 0) {
            console.log("trivial reject"); // trivial reject
            done = true;
            break;
		}
		else {
			// choose endpoint that is outside view
			if (outcode0 !== 0) {
                selected_point = endpt0;
                selected_outcode = outcode0;
			}
			else {
                selected_point = endpt1;
                selected_outcode = outcode1;
			}
			// calculate t (for intersection point with corresponding plane)
			if (selected_outcode & LEFT) {
                t = (-selected_point.x + selected_point.z) / (deltax - deltaz);
			}
			else if (selected_outcode & RIGHT) {
                t = (selected_point.x + selected_point.z) / (-deltax - deltaz);
			}
			else if (selected_outcode & BOTTOM) {
                t = (-selected_point.y + selected_point.z) / (deltay - deltaz);
			}
			else if (selected_outcode & TOPP) {
                t = (selected_point.y + selected_point.z) / (-deltay - deltaz);
            }
            else if (selected_outcode & NEAR) {
                t = (selected_point.z - zmin) / -deltaz;
            }
            else { // if (selected_outcode & FAR)
                t = (-selected_point.z - 1) / deltaz;
            }
			
			// replace selected endpoint with intersection point
			if (selected_outcode === outcode0) {
				endpt0.x = endpt0.x + t * (endpt1.x - endpt0.x);
                endpt0.y = endpt0.y + t * (endpt1.y - endpt0.y);
                endpt0.z = endpt0.z + t * (endpt1.z - endpt0.z);
			}
			else {
				endpt1.x = endpt1.x + t * (endpt1.x - endpt0.x);
                endpt1.y = endpt1.y + t * (endpt1.y - endpt0.y);
                endpt1.z = endpt1.z + t * (endpt1.z - endpt0.z);
            }
            line = {pt0: endpt0, pt1: endpt1};
        }
        loops++;
        if (loops > 5) {
            // sometimes the loop gets stuck with t being really close to 0, so this should stop that
            done = true;
        }
    }
	return line;
}

function outcodeParallel(pt) {
	var outcode = 0;
    if (pt.x < -1) outcode += LEFT;
	else if (pt.x > 1) outcode += RIGHT;
	if (pt.y < -1) outcode += BOTTOM;
    else if (pt.y > 1) outcode += TOPP;
    if (pt.z > 0) outcode += NEAR;
    else if (pt.z < -1) outcode += FAR;
	return outcode; 
}

function outcodePerspective(pt, zmin) {
    var outcode = 0;
    if (pt.x < pt.z) outcode += LEFT;
	else if (pt.x > -pt.z) outcode += RIGHT;
	if (pt.y < pt.z) outcode += BOTTOM;
    else if (pt.y > -pt.z) outcode += TOPP;
    if (pt.z > zmin) outcode += NEAR;
    else if (pt.z < -1) outcode += FAR;
	return outcode; 
}
