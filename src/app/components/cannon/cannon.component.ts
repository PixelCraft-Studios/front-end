import { Component, ElementRef, inject } from '@angular/core';
import * as THREE from 'three';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Ammo from 'src/assets/libs/ammo.js';
import { ConvexObjectBreaker }  from 'three/examples/jsm/misc/ConvexObjectBreaker.js';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-cannon',
  standalone: true,
  imports: [],
  templateUrl: './cannon.component.html',
  styleUrl: './cannon.component.css'
})
export class CannonComponent {

  private el = inject(ElementRef);
  private Ammo: typeof Ammo;

  // GRAPHICS
  private scene: THREE.Scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, .2, 2000 );
  private renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // set to false for transparent background
  private font!: Font;
  private controls!: OrbitControls;
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  private clock: THREE.Clock = new THREE.Clock();

  private mouseCoords : THREE.Vector2 = new THREE.Vector2();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  private ballMaterial: THREE.MeshPhongMaterial = new THREE.MeshPhongMaterial( { color: 0x202020 });

  // PHYSICS
  private gravityConstant = 7.8;
  private collisionConfiguration!: any;
  private dispatcher!: any;
  private broadphase!: any;
  private solver!: any;
  // as per: https://github.com/bulletphysics/bullet3/blob/master/docs/Bullet_User_Manual.pdf
  // the entire physics pipeline and its data structures are represented in Bullet by a dynamics world
  private physicsWorld!: any// this is the defaul implementation

  private margin = 0.05;

  private convexObjectBreaker = new ConvexObjectBreaker();

  private pos: THREE.Vector3 = new THREE.Vector3();
  private quat: THREE.Quaternion = new THREE.Quaternion();

  private transformAux1: any;
  private tempBtVect3_1: any;

  private rigidBodies: THREE.Mesh[] = [];

  private objectsToRemove: (null | any)[] = [];

  private initializeObjectsToRemove(): void {
    for (let i = 0; i < 500; i++) {
      this.objectsToRemove[i] = null;
    }
  }

  private numberOfObjectsToRemove = 0;
  private impactPoint: THREE.Vector3 = new THREE.Vector3();
  private impactNormal: THREE.Vector3 = new THREE.Vector3();

  private questionData: any = []
  private questionMaterials: THREE.Material[] = [];
  private questionWord: string = "";

  constructor(private http: HttpClient) {
    this.initializeObjectsToRemove();

    const numberOfQuestions = 3;
    const mediaPath = ' https://sevenseas-nest-5a6h3crcgq-rj.a.run.app/media/'

    this.http.get(' https://sevenseas-nest-5a6h3crcgq-rj.a.run.app/database/some/' + numberOfQuestions).subscribe(
      (data) => {
        this.questionData = data;
        console.log(data);
        // extract the right word
        this.questionWord = this.questionData[0].word;

        for(let i = 0; i < numberOfQuestions; i++) {
          const imagePath = mediaPath + this.questionData[i].image;
          const textureMaterial = this.createMaterialFromTexture(imagePath);
          this.questionMaterials.push(textureMaterial);
        }
        
      }
    );
  }

  ngOnInit() {

    this.loadFont();
    
  }

  private loadFont() {
    const loader = new FontLoader();
    loader.load('assets/fonts/Pacifico_Regular.json', (loadedFont) => {
      if (loadedFont) {
        this.font = loadedFont;
        console.log('font loaded!');
        // this.create3dText();
        // this.createBoxes();
        Ammo().then(  ( AmmoLib: typeof Ammo ) => {

          this.Ammo = AmmoLib;
            console.log('loaded ammo!')
            this.init();
            this.animate();
    
        } );
      }
    });
  }



  init() {

    this.initGraphics();
    this.initPhysics();
    this.createGround();
    this.createBoxes();
    this.create3dText();
    this.initInput();

  }

  initGraphics() {

    const container = this.el.nativeElement.querySelector('div');

    this.scene.background = new THREE.Color( 0xbfd1e5 );

		this.camera.position.set( - 14, 8, 16 );

    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.shadowMap.enabled = true;

    container.appendChild( this.renderer.domElement );

    this.controls = new OrbitControls( this.camera, this.renderer.domElement );
    this.controls.target.set( 0, 2, 0 );
    this.controls.update();

    const ambientLight = new THREE.AmbientLight( 0xbbbbbb );
    this.scene.add( ambientLight );

    const light = new THREE.DirectionalLight( 0xffffff, 3 );
    light.position.set( - 10, 18, 5 );
    light.castShadow = true;
    const d = 14;
    light.shadow.camera.left = - d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = - d;

    light.shadow.camera.near = 2;
    light.shadow.camera.far = 50;

    light.shadow.mapSize.x = 1024;
    light.shadow.mapSize.y = 1024;

    this.scene.add( light );

    window.addEventListener( 'resize', this.onWindowResize );
  }

  initPhysics() {

    this.collisionConfiguration = new this.Ammo.btDefaultCollisionConfiguration();
    this.dispatcher =  new this.Ammo.btCollisionDispatcher( this.collisionConfiguration );
    this.broadphase =  new this.Ammo.btDbvtBroadphase();
    this.solver =  new this.Ammo.btSequentialImpulseConstraintSolver();
    this.physicsWorld = new this.Ammo.btDiscreteDynamicsWorld( this.dispatcher, this.broadphase, this.solver, this.collisionConfiguration );
    
    const vector = new this.Ammo.btVector3( 0, - this.gravityConstant, 0 );
    
    this.physicsWorld.setGravity( vector );

    this.transformAux1 = new this.Ammo.btTransform();
		this.tempBtVect3_1 = new this.Ammo.btVector3( 0, 0, 0 );

  }

  initInput() {
    window.addEventListener( 'pointerdown', ( event ) => {

      this.mouseCoords.set(
        ( event.clientX / window.innerWidth ) * 2 - 1,
        - ( event.clientY / window.innerHeight ) * 2 + 1
      );

      this.raycaster.setFromCamera( this.mouseCoords, this.camera );

      // Creates a ball and throws it
      const ballMass = 35;
      const ballRadius = 0.4;

      const ball = new THREE.Mesh( new THREE.SphereGeometry( ballRadius, 14, 10 ), this.ballMaterial );
      ball.castShadow = true;
      ball.receiveShadow = true;
      const ballShape = new this.Ammo.btSphereShape( ballRadius );
      ballShape.setMargin( this.margin );
      this.pos.copy( this.raycaster.ray.direction );
      this.pos.add( this.raycaster.ray.origin );
      this.quat.set( 0, 0, 0, 1 );
      const ballBody = this.createRigidBody(ball, ballShape, ballMass, this.pos, this.quat, undefined, undefined);

      this.pos.copy( this.raycaster.ray.direction );
      this.pos.multiplyScalar( 24 );
      ballBody.setLinearVelocity( new this.Ammo.btVector3( this.pos.x, this.pos.y, this.pos.z ) );

    } );
  }


///  CREATE FUNCTIONS

  private create3dText() {
    this.pos.set(0, 10, 10);
    this.quat.set(0, 0, 0, 1);
    this.create3dTextObject(this.questionWord, 0.02, this.pos, this.quat, this.createMaterial(0xffffff));
  }

  private create3dTextObject(text: string, mass: number, pos: THREE.Vector3, quat: THREE.Quaternion, material: THREE.Material) {
    const textGeometry = new TextGeometry(text, {
      font: this.font,
      size: 1, // Adjust the size as needed
      height: .5, // Adjust the height as needed
      curveSegments: 3,
      bevelEnabled: false,
    });


    const textMesh = new THREE.Mesh(textGeometry, material);

    textMesh.position.copy(pos);
    textMesh.quaternion.copy(quat);

    this.convexObjectBreaker.prepareBreakableObject(textMesh, mass, new THREE.Vector3(), new THREE.Vector3(), true);
    this.createDebrisFromBreakableObject(textMesh);
  }

  private createBoxes() {
    const boxHalfExtents = new THREE.Vector3(2, 2, 2);
    const boxMass = 1000;
    this.quat.set(0, 0, 0, 1);
  
    for (let i = 0; i < 3; i++) {
      const spacing = 20; // Adjust this value for the desired spacing
      const m = i + 1;
      this.pos.set((-10 * m) + (spacing * i), 10, 1 * m);
      this.createBoxObject(boxMass, boxHalfExtents, this.pos, this.quat, this.questionMaterials[i]);
    }
  }

  private createMaterial( color: number ) {

    color = color || this.createRandomColor();
    return new THREE.MeshPhongMaterial( { color: color } );

  }

  private createMaterialFromTexture(texturePath: string): THREE.Material {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(texturePath);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshPhongMaterial({map: texture,})
  }

  private createRandomColor() {

    return Math.floor( Math.random() * ( 1 << 24 ) );

  }

  private createBoxObject(mass: number, halfExtents: THREE.Vector3, pos: THREE.Vector3, quat: THREE.Quaternion, material: THREE.Material) {

    const boxObject = new THREE.Mesh(new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2), material);
    boxObject.position.copy(pos);
    boxObject.quaternion.copy(quat);
    this.convexObjectBreaker.prepareBreakableObject(boxObject, mass, new THREE.Vector3(), new THREE.Vector3(), true); 
    this.createDebrisFromBreakableObject(boxObject);
  }

  private createDebrisFromBreakableObject(object: THREE.Mesh, isFragment: boolean = false) {
    object.castShadow = true;
    object.receiveShadow = true;

    const shape = this.createConvexHullPhysicsShape(object.geometry.attributes['position'].array)
    shape.setMargin(this.margin);
    if(isFragment) {
      console.log('fragment!!');
      object.material = this.createMaterial(this.createRandomColor());

    }

    const body = this.createRigidBody(
      object, shape, object.userData['mass'], 
      null, null, 
      object.userData['velocity'], 
      object.userData['angularVelocity']
    );

    // set pointer back to the three object only in the debris objects
    const btVecUserData = new this.Ammo.btVector3(0, 0, 0);
    btVecUserData.threeObject = object;
    body.setUserPointer(btVecUserData);
  
  }

  private createConvexHullPhysicsShape(coords: THREE.TypedArray) {

    const shape = new this.Ammo.btConvexHullShape();
    const coordsLen = coords.length;
    for(let i = 0; i < coordsLen; i += 3 ) {
      this.tempBtVect3_1.setValue(coords[i], coords[i + 1], coords[i + 2]);
      // last
      const lastPoint = (i >= (coordsLen - 3));
      shape.addPoint(this.tempBtVect3_1, lastPoint);
    }
    return shape;

  }

  private createGround() {
    // Ground
    this.pos.set( 0, - 0.5, 0 );
			this.quat.set( 0, 0, 0, 1 );
			const ground = this.createParalellepipedWithPhysics( 40, 1, 40, 0, this.pos, this.quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
			ground.receiveShadow = true;
			this.textureLoader.load( 'assets/textures/grid.png', function ( texture ) {

				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;
				texture.repeat.set( 40, 40 );
				ground.material.map = texture;
				ground.material.needsUpdate = true;

			} );
  }

  private createParalellepipedWithPhysics( sx: number, sy: number, sz: number, mass: number, pos: THREE.Vector3, quat: THREE.Quaternion, material: THREE.MeshPhongMaterial) {

    const object = new THREE.Mesh( new THREE.BoxGeometry( sx, sy, sz, 1, 1, 1 ), material );
    const shape = new this.Ammo.btBoxShape( new this.Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
    shape.setMargin( this.margin );

    this.createRigidBody( object, shape, mass, pos, quat, undefined, undefined );

    return object;

  }


  private createRigidBody(
    object: THREE.Mesh, physicsShape: any, mass: number, pos: THREE.Vector3 | null, quat: THREE.Quaternion | null, 
    vel: THREE.Vector3 | undefined, angVel: THREE.Vector3 | undefined ) {

    if (pos) {
      object.position.copy(pos);

    } else {
      pos = object.position;
    }
    if (quat) {
      object.quaternion.copy(quat);

    } else {
      quat = object.quaternion;

    }

    const transform = new this.Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new this.Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new this.Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    const motionState = new this.Ammo.btDefaultMotionState( transform );

    const localInertia = new this.Ammo.btVector3( 0, 0, 0 );
    physicsShape.calculateLocalInertia( mass, localInertia );

    const rbInfo = new this.Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
    const body = new this.Ammo.btRigidBody( rbInfo );

    body.setFriction( 0.5 );

    if ( vel ) {

      body.setLinearVelocity( new this.Ammo.btVector3( vel.x, vel.y, vel.z ) );

    }

    if ( angVel ) {

      body.setAngularVelocity( new this.Ammo.btVector3( angVel.x, angVel.y, angVel.z ) );

    }

    object.userData['physicsBody'] = body;
    object.userData['collided'] = false;

    this.scene.add( object );

    if (mass > 0) {

      this.rigidBodies.push( object );
      // Disable deactivation
      body.setActivationState( 4 );

    }

    this.physicsWorld.addRigidBody( body );

    return body;

  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }

  private animate = () => {

    requestAnimationFrame( this.animate );

    this.render();

  }

  private render() {

    const deltaTime = this.clock.getDelta();

    this.updatePhysics( deltaTime );

    this.renderer.render( this.scene, this.camera );

  }

  private removeDebris( object: THREE.Object3D ) {

    this.scene.remove( object );

    this.physicsWorld.removeRigidBody( object.userData['physicsBody'] );

  }

  private updatePhysics(deltaTime: number) {

    // Step world
    this.physicsWorld.stepSimulation( deltaTime, 10 );

    // Update rigid bodies
    for ( let i = 0, il = this.rigidBodies.length; i < il; i ++ ) {

      const objThree = this.rigidBodies[ i ];
      const objPhys = objThree.userData['physicsBody'];
      const ms = objPhys.getMotionState();

      if ( ms ) {

        ms.getWorldTransform( this.transformAux1 );
        const p = this.transformAux1.getOrigin();
        const q = this.transformAux1.getRotation();
        objThree.position.set( p.x(), p.y(), p.z() );
        objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

        objThree.userData['collided'] = false;

      }
    }

    for ( let i = 0, il = this.dispatcher.getNumManifolds(); i < il; i ++ ) {

      const contactManifold = this.dispatcher.getManifoldByIndexInternal( i );
      const rb0 = this.Ammo.castObject( contactManifold.getBody0(), this.Ammo.btRigidBody);
      const rb1 = this.Ammo.castObject( contactManifold.getBody1(), this.Ammo.btRigidBody );

      const threeObject0 = this.Ammo.castObject( rb0.getUserPointer(), this.Ammo.btVector3 ).threeObject;
      const threeObject1 = this.Ammo.castObject( rb1.getUserPointer(), this.Ammo.btVector3 ).threeObject;

      if ( ! threeObject0 && ! threeObject1 ) {

        continue;

      }

      const userData0 = threeObject0 ? threeObject0.userData : null;
      const userData1 = threeObject1 ? threeObject1.userData : null;

      const breakable0 = userData0 ? userData0.breakable : false;
      const breakable1 = userData1 ? userData1.breakable : false;

      const collided0 = userData0 ? userData0.collided : false;
      const collided1 = userData1 ? userData1.collided : false;

      if ( ( ! breakable0 && ! breakable1 ) || ( collided0 && collided1 ) ) {

        continue;

      }

      let contact = false;
      let maxImpulse = 0;
      for ( let j = 0, jl = contactManifold.getNumContacts(); j < jl; j ++ ) {

        const contactPoint = contactManifold.getContactPoint( j );

        if ( contactPoint.getDistance() < 0 ) {

          contact = true;
          const impulse = contactPoint.getAppliedImpulse();

          if ( impulse > maxImpulse ) {

            maxImpulse = impulse;
            const pos = contactPoint.get_m_positionWorldOnB();
            const normal = contactPoint.get_m_normalWorldOnB();
            this.impactPoint.set( pos.x(), pos.y(), pos.z() );
            this.impactNormal.set( normal.x(), normal.y(), normal.z() );

          }

          break;

        }

      }
      // If no point has contact, abort
      if ( ! contact ) continue;

      // Subdivision

      const fractureImpulse = 250;

      if ( breakable0 && ! collided0 && maxImpulse > fractureImpulse ) {

        const debris = this.convexObjectBreaker.subdivideByImpact(threeObject0, this.impactPoint, this.impactNormal, 1, 2);

        const numObjects = debris.length;
        for ( let j = 0; j < numObjects; j ++ ) {

          const vel = rb0.getLinearVelocity();
          const angVel = rb0.getAngularVelocity();
          const fragment = debris[ j ];
          fragment.userData['velocity'].set( vel.x(), vel.y(), vel.z() );
          fragment.userData['angularVelocity'].set( angVel.x(), angVel.y(), angVel.z() );

          this.createDebrisFromBreakableObject(fragment as THREE.Mesh, true );

        }

        this.objectsToRemove[ this.numberOfObjectsToRemove++ ] = threeObject0;
        userData0.collided = true;

        if ( breakable1 && ! collided1 && maxImpulse > fractureImpulse ) {

          const debris = this.convexObjectBreaker.subdivideByImpact( threeObject1, this.impactPoint, this.impactNormal, 1, 2);

          const numObjects = debris.length;
          for ( let j = 0; j < numObjects; j ++ ) {

            const vel = rb1.getLinearVelocity();
            const angVel = rb1.getAngularVelocity();
            const fragment = debris[ j ];
            fragment.userData['velocity'].set( vel.x(), vel.y(), vel.z() );
            fragment.userData['angularVelocity'].set( angVel.x(), angVel.y(), angVel.z() );

            this.createDebrisFromBreakableObject( fragment as THREE.Mesh, true );

          }

          this.objectsToRemove[ this.numberOfObjectsToRemove ++ ] = threeObject1;
          userData1.collided = true;

        }

      }
    }

    for ( let i = 0; i < this.numberOfObjectsToRemove; i++ ) {
      this.removeDebris( this.objectsToRemove[ i ] );

    }
    this.numberOfObjectsToRemove = 0;
  }
}

