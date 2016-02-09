/**
 * Created by endre on 12.10.15.
 */

var HeightMapBufferGeometry = function(heightData, widthSegments, depthSegments, maxHeight) {

    if (maxHeight === undefined) {
        maxHeight = 255;
    }

    // Create the mesh as a 1 x 1 mesh, each cell is (1/widthSegments) x (1/depthSegments).
    THREE.PlaneBufferGeometry.call(this, 1, 1, widthSegments-1, depthSegments-1);

    this.type = 'HeightMapBufferGeometry';
    this.parameters.scale = new THREE.Vector3(1,1,1);

    this.rotateX( - Math.PI / 2 );

    var vertices = this.attributes.position.array;

    for ( var i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3 ) {

        vertices[ j + 1 ] = heightData[ i ] / maxHeight;

    }

    this.computeVertexNormals();
    this.computeBoundingBox();
    this.computeBoundingSphere();
};

HeightMapBufferGeometry.prototype = Object.create( THREE.PlaneBufferGeometry.prototype );
HeightMapBufferGeometry.prototype.constructor = HeightMapBufferGeometry;

HeightMapBufferGeometry.prototype.computeVertexIndex = function(xPos, zPos) {
    var widthVertices = this.parameters.widthSegments + 1;
    var depthVertices = this.parameters.heightSegments + 1;

    xPos -= this.boundingBox.min.x;
    zPos -= this.boundingBox.min.z;

    xPos = xPos / this.parameters.scale.x;
    zPos = zPos / this.parameters.scale.z;

    if (xPos < 0) {
        xPos = 0;
    } else if (xPos >= 1) {
        xPos = (widthVertices - 1)/widthVertices;
    }

    if (zPos < 0) {
        zPos = 0;
    } else if (zPos >= 1) {
        zPos = (depthVertices - 1)/depthVertices;
    }

    //console.log('will compute vertex index for params ' + xPos + ' and ' + zPos);

    xPos = Math.floor(xPos * widthVertices);
    zPos = Math.floor(zPos * depthVertices);

    var index = zPos*widthVertices + xPos;

    //console.log('computed ' + xPos + ', ' + zPos + ' which gives ' + index);
    return index;
};

HeightMapBufferGeometry.prototype.getHeightAtPoint = function(localPos) {
    var vertexIndex = 3*this.computeVertexIndex(localPos.x, localPos.z);

    var height = this.attributes.position.array[vertexIndex + 1];

    return height;
};

HeightMapBufferGeometry.prototype.scale = function(x, y, z) {
    THREE.PlaneBufferGeometry.prototype.scale.call(this, x,y,z);

    this.parameters.scale.set(x,y,z);
};

var HeightMapMesh = function(heightMapGeometry, material) {

    // Create the mesh as a widthSegements x heightSegments mesh, each cell is 1x1.
    THREE.Mesh.call(this, heightMapGeometry, material);

    this.type = 'HeightMapMesh';

    if (!(heightMapGeometry instanceof HeightMapBufferGeometry)) {
        console.error('HeightMapMesh: heightMapGeometry is not instance of HeightMapBufferGeometry', heightMapGeometry);
    }
};

HeightMapMesh.prototype = Object.create( THREE.Mesh.prototype );
HeightMapMesh.prototype.constructor = HeightMapMesh;

HeightMapMesh.prototype.getHeightAtPoint = function(localPos) {
    return this.computePositionAtPoint(localPos).y;
};

HeightMapMesh.prototype.computePositionAtPoint = function(localPos) {
    var inverse = new THREE.Matrix4().getInverse(this.matrix);
    var pos = new THREE.Vector4().copy(localPos);

    // Convert coordinates from possibly scaled, translated and rotated coordinates to object local coordinates.
    pos.applyMatrix4(inverse);

    var height = this.geometry.getHeightAtPoint(pos);

    pos.setY(height);

    pos.applyMatrix4(this.matrix);
    return pos;
};