/**
 * @author inear
 * 
 */

// Alignment enums

THREE.SpriteAlignment = {};
THREE.SpriteAlignment.topLeft = new THREE.Vector2(1, -1);
THREE.SpriteAlignment.topCenter = new THREE.Vector2(0, -1);
THREE.SpriteAlignment.topRight = new THREE.Vector2(-1, -1);
THREE.SpriteAlignment.centerLeft = new THREE.Vector2(1, 0);
THREE.SpriteAlignment.center = new THREE.Vector2(0, 0);
THREE.SpriteAlignment.centerRight = new THREE.Vector2(-1, 0);
THREE.SpriteAlignment.bottomLeft = new THREE.Vector2(1, 1);
THREE.SpriteAlignment.bottomCenter = new THREE.Vector2(0, 1);
THREE.SpriteAlignment.bottomRight = new THREE.Vector2(-1, 1);
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author szimek / https://github.com/szimek/
 */

THREE.Vertex = function (a) {
    this.position = a || new THREE.Vector3;
    return this.position;
};

THREE.UV = function (u, v) {
    console.warn('THREE.UV has been DEPRECATED. Use THREE.Vector2 instead.')
    return new THREE.Vector2(u, v);
};

var PI2 = Math.PI * 2
var TO_RADIANS = Math.PI / 180;
var _branchSegments = 24;

Cylinder = function ( materials, radius ) {
	
	THREE.Mesh.call( this, new THREE.Geometry(), materials );

	var numCurrentPos = 0;
	
	this.doubleSided = false;
	
	var basePoint = new THREE.Vector3(0,0,0);
	var branchPoint = new THREE.Object3D();
	branchPoint.position = new THREE.Vector3(0,0,0);
	this.radius = radius;

	var R;
	var S;
	var branchPoint;
	
	//this.geometry.boundingSphere = radius * 1.2;
	this.geometry.boundingSphere= new THREE.Sphere(
				basePoint,
    			radius * 7.2
			);
	this.geometry.boundingSphere.visable = true;
	var vertices = this.geometry.vertices;
	var faces = this.geometry.faces;
	var faceVertexUvs = this.geometry.faceVertexUvs;
	
	this.totalLinks = 300;
	this.linkDist = 4.5;
	this.segmentAngle = Math.PI * 2 / _branchSegments;
	this.ring = new Array(this.totalLinks);
	this.ringOrigin = new Array(this.totalLinks);
	this.offsetPoints = new Array(this.totalLinks);
	
	var radiusStep = 0//this.radius/this.totalLinks;
	
	this.build = function() {
	
		//reset
		var segmentsEachTime = 0;
		//for each step
		while (segmentsEachTime < this.totalLinks)
		{
			segmentsEachTime++
			//last point
			basePoint.x = branchPoint.position.x;
			basePoint.y = branchPoint.position.y;
			basePoint.z = branchPoint.position.z;
			
			//move forward
			branchPoint.translateZ(this.linkDist);
			
			this.radius -= radiusStep
			
			//difference from last segment
			var diffVector = new THREE.Vector3();
			//diffVector.sub(branchPoint.position, basePoint)
			diffVector.subVectors(branchPoint.position, basePoint);
			
			var transformPoint = new THREE.Vector3();
			//transformPoint.add(diffVector, new THREE.Vector3(10, 0, 0));
			transformPoint.addVectors(diffVector, new THREE.Vector3(10, 0, 0));

			//height from transformPoint
			R = new THREE.Vector3();
		    //R.cross(transformPoint, diffVector);
			R.crossVectors(transformPoint, diffVector);
			
			S = new THREE.Vector3();
			//S.cross(R, diffVector);
			S.crossVectors(R, diffVector);

			R.normalize();
			S.normalize();
		
			//build branch
			this.buildNode();

			branchPoint.updateMatrix();
			numCurrentPos++;		
		}
		
		//this.geometry.computeCentroids()
	}
	
	this.buildNode = function() {
		
		var intSegmentStep;
		var pX;
		var pY;
		var pZ;
		var newVertex3D;
		var p1,p2,p3,p4;
		
		var bFirstNode = numCurrentPos == 0
		
		//ring 2-len
		var transformedRadius = this.radius;
		
		intSegmentStep = 0;

		this.offsetPoints[numCurrentPos] =  new THREE.Vector3(0,0,0);
		this.ring[numCurrentPos] = new Array();
		this.ringOrigin[numCurrentPos] = new Array();

		while (intSegmentStep < _branchSegments)
		{
			//root node
			transformedRadius = this.radius;
						
			if( transformedRadius < 1) transformedRadius = 1
			
			pX = basePoint.x + transformedRadius * Math.cos(intSegmentStep * this.segmentAngle) * R.x + transformedRadius * Math.sin(intSegmentStep * this.segmentAngle) * S.x;
			pY = basePoint.y + transformedRadius * Math.cos(intSegmentStep * this.segmentAngle) * R.y + transformedRadius * Math.sin(intSegmentStep * this.segmentAngle) * S.y;
			pZ = basePoint.z + transformedRadius * Math.cos(intSegmentStep * this.segmentAngle) * R.z + transformedRadius * Math.sin(intSegmentStep * this.segmentAngle) * S.z;

			newVertex3D = new THREE.Vertex(new THREE.Vector3(pX, pY, pZ));

			vertices.push(newVertex3D);

			this.ring[numCurrentPos].push( newVertex3D );
			this.ringOrigin[numCurrentPos].push(new THREE.Vertex(new THREE.Vector3(pX, pY, pZ)));

			intSegmentStep++;
		}

		if ( bFirstNode ) return;

		intSegmentStep = 0;
		while (intSegmentStep < _branchSegments)
		{
			
			if ( intSegmentStep < (_branchSegments - 1)) {
				//second floor
				p1 = vertices.length - _branchSegments + intSegmentStep + 1;
				p4 = vertices.length - _branchSegments + intSegmentStep ;
				
				//first floor
				p2 = vertices.length - _branchSegments * 2 + intSegmentStep + 1;
				p3 = vertices.length - _branchSegments * 2 + intSegmentStep;
			}
			else {
				//last side - connected to first point in ring
				//second floor
				p1 = vertices.length - _branchSegments;
				p4 = vertices.length - _branchSegments + intSegmentStep;
				
				p2 = vertices.length - _branchSegments * 2;
				p3 = vertices.length - _branchSegments * 2 + intSegmentStep;
			}	

			faces.push(new THREE.Face3(p1, p2, p3));
			//faces.push(new THREE.Face3(p1, p3, p4));
			var startX = 1/_branchSegments*(intSegmentStep+1);
			var endX = startX - 1/_branchSegments;		
			var startY = numCurrentPos/this.totalLinks//*3;
			var endY = startY + 1/this.totalLinks//*3
			//var startY = 0
			//var endY = 1		
			faceVertexUvs[0].push([
				new THREE.Vector2(startX, endY),
				new THREE.Vector2(startX, startY),
				new THREE.Vector2(endX, startY)
                //new THREE.Vector2(endX, endY)
			]);

			faces.push(new THREE.Face3(p1, p3, p4));
			faceVertexUvs[0].push([
				new THREE.Vector2(startX, endY),
				//new THREE.Vector2(startX, startY),
				new THREE.Vector2(endX, startY),
                new THREE.Vector2(endX, endY)
			]);
		
			intSegmentStep++;
		}
	}
	
};


Cylinder.prototype = new THREE.Mesh();
Cylinder.prototype.constructor = Cylinder;
Cylinder.prototype.supr = THREE.Mesh.prototype;
