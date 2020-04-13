// set values of mat4x4 to the parallel projection / view matrix
function Mat4x4Parallel(mat4x4, prp, srp, vup, clip) {
    var left = clip[0];
    var right = clip[1];
    var bottom = clip[2];
    var topp = clip[3];
    var near = clip[4];
    var far = clip[5];
    // 1. translate PRP to origin
    var t_negprp = new Matrix(4, 4);
    Mat4x4Translate(t_negprp, -prp.x, -prp.y, -prp.z);

    // 2. rotate VRC such that (u,v,n) align with (x,y,z)
    var n = prp.subtract(srp);
    n.normalize();
    var u = vup.cross(n);
    u.normalize();
    var v = n.cross(u);
    var vrc = {n: n, u: u, v: v};
    var rotate_matrix = new Matrix(4, 4);
    rotate_matrix.values = [[vrc.u.x, vrc.u.y, vrc.u.z, 0],[vrc.v.x, vrc.v.y, vrc.v.z, 0],[vrc.n.x, vrc.n.y, vrc.n.z, 0], [0, 0, 0, 1]];

    // 3. shear such that CW is on the z-axis
    var CW = Vector3((left+right)/2, (bottom+topp)/2, -near);
    var prp_vrc = Vector3(0, 0, 0);
    var DOP = CW.subtract(prp_vrc);
    DOP.normalize();
    console.log(DOP);
    var shxpar = (-DOP.x)/DOP.z;
    console.log(shxpar);
    var shypar = (-DOP.y)/DOP.z;
    console.log(shypar);
    var shpar = new Matrix(4,4);
    Mat4x4ShearXY(shpar, shxpar, shypar);
    console.log(CW, DOP, shpar);

    // 4. translate near clipping plane to origin
    var tpar = new Matrix(4,4)
    Mat4x4Translate(tpar, 0, 0, near);
    console.log(tpar);

    // 5. scale such that view volume bounds are ([-1,1], [-1,1], [-1,0])
    var sparx = 2/(right-left);
    var spary = 2/(topp-bottom);
    var sparz = 1/(far-near);
    var spar = new Matrix(4,4);
    Mat4x4Scale(spar, sparx, spary, sparz);
    console.log(spar);

    var transform = Matrix.multiply([spar, tpar, shpar, rotate_matrix, t_negprp]);
    mat4x4.values = transform.values;
    console.log(mat4x4.values);
}

// set values of mat4x4 to the parallel projection / view matrix
function Mat4x4Projection(mat4x4, prp, srp, vup, clip) {
    var left = clip[0];
    var right = clip[1];
    var bottom = clip[2];
    var topp = clip[3];
    var near = clip[4];
    var far = clip[5];

    // 1. translate PRP to origin
    var t_negprp = new Matrix(4, 4);
    Mat4x4Translate(t_negprp, -prp.x, -prp.y, -prp.z);

    // 2. rotate VRC such that (u,v,n) align with (x,y,z)
    var n = prp.subtract(srp);
    n.normalize();
    var u = vup.cross(n);
    u.normalize();
    var v = n.cross(u);
    var vrc = {n: n, u: u, v: v};
    var rotate_matrix = new Matrix(4, 4);
    rotate_matrix.values = [[vrc.u.x, vrc.u.y, vrc.u.z, 0],[vrc.v.x, vrc.v.y, vrc.v.z, 0],[vrc.n.x, vrc.n.y, vrc.n.z, 0], [0, 0, 0, 1]];

    // 3. shear such that CW is on the z-axis
    var CW = Vector3((left+right)/2, (bottom+topp)/2, -near);
    var prp_vrc = Vector3(0, 0, 0);
    var DOP = CW.subtract(prp_vrc);
    DOP.normalize();
    var shxper = (-DOP.x)/DOP.z;
    var shyper = (-DOP.y)/DOP.z;
    var shper = new Matrix(4,4);
    Mat4x4ShearXY(shper, shxper, shyper);

    // 4. scale such that view volume bounds are ([z,-z], [z,-z], [-1,zmin])
    var sperx = (2*near)/((right-left)*far);
    var spery = (2*near)/((topp - bottom)*far);
    var sperz = 1/far;
    var sper = new Matrix(4, 4);
    Mat4x4Scale(sper, sperx, spery, sperz);
    var transform = Matrix.multiply([sper, shper, rotate_matrix, t_negprp]);
    mat4x4.values = transform.values;
    
}

// set values of mat4x4 to project a parallel image on the z=0 plane
function Mat4x4MPar(mat4x4) {
    mat4x4.values = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 1]];
}

// set values of mat4x4 to project a perspective image on the z=-1 plane
function Mat4x4MPer(mat4x4) {
    mat4x4.values = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, -1, 0]];
}



///////////////////////////////////////////////////////////////////////////////////
// 4x4 Transform Matrices                                                         //
///////////////////////////////////////////////////////////////////////////////////

// set values of mat4x4 to the identity matrix
function Mat4x4Identity(mat4x4) {
    mat4x4.values = [[1, 0, 0, 0],
                     [0, 1, 0, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of mat4x4 to the translate matrix
function Mat4x4Translate(mat4x4, tx, ty, tz) {
    mat4x4.values = [[1, 0, 0, tx],
                     [0, 1, 0, ty],
                     [0, 0, 1, tz],
                     [0, 0, 0, 1]];
}

// set values of mat4x4 to the scale matrix
function Mat4x4Scale(mat4x4, sx, sy, sz) {
    mat4x4.values = [[sx,  0,  0, 0],
                     [ 0, sy,  0, 0],
                     [ 0,  0, sz, 0],
                     [ 0,  0,  0, 1]];
}

// set values of mat4x4 to the rotate about x-axis matrix
function Mat4x4RotateX(mat4x4, theta) {
    mat4x4.values = [[1,               0,                0, 0],
                     [0, Math.cos(theta), -Math.sin(theta), 0],
                     [0, Math.sin(theta),  Math.cos(theta), 0],
                     [0,               0,                0, 1]];
}

// set values of mat4x4 to the rotate about y-axis matrix
function Mat4x4RotateY(mat4x4, theta) {
    mat4x4.values = [[ Math.cos(theta), 0, Math.sin(theta), 0],
                     [               0, 1,               0, 0],
                     [-Math.sin(theta), 0, Math.cos(theta), 0],
                     [0, 0, 0, 1]];
}

// set values of mat4x4 to the rotate about z-axis matrix
function Mat4x4RotateZ(mat4x4, theta) {
    mat4x4.values = [[Math.cos(theta), -Math.sin(theta), 0, 0],
                     [Math.sin(theta),  Math.cos(theta), 0, 0],
                     [              0,                0, 1, 0],
                     [              0,                0, 0, 1]];
}

// set values of mat4x4 to the shear parallel to the xy-plane matrix
function Mat4x4ShearXY(mat4x4, shx, shy) {
    mat4x4.values = [[1, 0, shx, 0],
                     [0, 1, shy, 0],
                     [0, 0,   1, 0],
                     [0, 0,   0, 1]];
}

// create a new 3-component vector with values x,y,z
function Vector3(x, y, z) {
    let vec3 = new Vector(3);
    vec3.values = [x, y, z];
    return vec3;
}

// create a new 4-component vector with values x,y,z,w
function Vector4(x, y, z, w) {
    let vec4 = new Vector(4);
    vec4.values = [x, y, z, w];
    return vec4;
}

