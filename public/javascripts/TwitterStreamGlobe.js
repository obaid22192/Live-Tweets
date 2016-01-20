(function () {

	var TwtrGlobe = this.TwtrGlobe = { },
	// var webglEl = document.getElementById('globe-holder');
	// Constants
	POS_X = 0,
	POS_Y = 800,
	POS_Z = 2000,
	FOV = 45,
	NEAR = 1,
	FAR = 150000,
	PI_HALF = Math.PI / 2;

	var renderer, camera, scene, pubnub, innerWidth, innerHeight;

	/**
	 *	Initiates WebGL view with Three.js
	 */
	TwtrGlobe.init = function () {

		if (!this.supportsWebGL()) {
			window.location = '/upgrade';
			return;
		}

		var innerWidth = window.innerWidth;
		var innerHeight = window.innerHeight;

		renderer = new THREE.WebGLRenderer({ antialiasing: true });
		renderer.setSize(innerWidth, innerHeight);
		renderer.setClearColor(0x00000000, 0.0);

		document.getElementById('globe-holder').appendChild(renderer.domElement);
		console.log(renderer.getContext());

		camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, NEAR, FAR);
		camera.position.set(POS_X, POS_Y, POS_Z);
		camera.lookAt( new THREE.Vector3(0,0,0) );

		scene = new THREE.Scene();
		scene.add(camera);
		scene.add(new THREE.AmbientLight(0x333333));

		var light = new THREE.DirectionalLight(0xffffff, 1);
		light.position.set(5,3,5);
		scene.add(light);

		earth = addEarth();

		// var clouds = createClouds(600, 50);
		// clouds.rotation.y = 6;
		// scene.add(clouds)

		var stars = createStars(3600, 100);
		scene.add(stars);
		var controls = new THREE.TrackballControls(camera);

		// webglEl.appendChild(renderer.domElement);

		render();

		function render() {
			controls.update();
			earth.rotation.y += 0.0005;
			// clouds.rotation.y += 0.0005;
			requestAnimationFrame(render);
			renderer.render(scene, camera);
		}

		// addEarth();
		addStats();
		animate();

		window.addEventListener ('resize', onWindowResize);
	}

	var earthMesh, beaconHolder;

	/**
	 *	Creates the Earth sphere
	 */
	function addEarth () {

	  var sphereGeometry = new THREE.SphereGeometry(600, 50, 50);

	  var shader = Shaders.earth;
	  var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
	  var res = JSON.parse(window.localStorage.getItem('globe'))
	  var globe_image = ''
	  if(res !== null || res !== undefined) {
	  	globe_image = /images/ + res.world_globe + '.png';
		}
	  else {
	  	globe_image = '/images/world.png';
	  	window.localStorage.setItem('globe', JSON.stringify({world_globe: 'world'}));
	  }
	  uniforms['texture'].value = THREE.ImageUtils.loadTexture(globe_image);

	  var material = new THREE.ShaderMaterial({
	    uniforms: uniforms,
	    vertexShader: shader.vertexShader,
	    fragmentShader: shader.fragmentShader
	  });
	 //  var meshphong = new THREE.MeshPhongMaterial({
		// 	map:         THREE.ImageUtils.loadTexture('/images/2_no_clouds_4k.jpg'),
		// 	bumpMap:     THREE.ImageUtils.loadTexture('/images/elev_bump_4k.jpg'),
		// 	bumpScale:   0.005,
		// 	specularMap: THREE.ImageUtils.loadTexture('/images/water_4k.png'),
		// 	specular:    new THREE.Color('grey')
		// })
	  earthMesh = new THREE.Mesh(sphereGeometry, material);
	  scene.add(earthMesh);
	  // earthMesh.add(meshphong);
	  // add an empty container for the beacons to be added to
	  beaconHolder = new THREE.Object3D();
	  earthMesh.add(beaconHolder);
	  return earthMesh
	}

	function createStars(radius, segments) {
		return new THREE.Mesh(
			new THREE.SphereGeometry(radius, segments, segments),
			new THREE.MeshBasicMaterial({
				map:  THREE.ImageUtils.loadTexture('/images/galaxy_starfield.png'),
				side: THREE.BackSide
			})
		);
	}

	function createClouds(radius, segments) {
			return new THREE.Mesh(
				new THREE.SphereGeometry(radius + 0.003, segments, segments),
				new THREE.MeshPhongMaterial({
					map:         THREE.ImageUtils.loadTexture('/images/fair_clouds_4k.png'),
					transparent: true
				})
			);
		}

	var stats;

	/**
	 * Adds FPS stats view for debugging
	 */
	function addStats () {
		stats = new Stats();
		stats.setMode(0); // 0: fps, 1: ms

		stats.domElement.style.position = 'absolute';
		stats.domElement.style.right = '20px';
		stats.domElement.style.bottom = '100px';

		document.body.appendChild( stats.domElement );
	}

	/**
	 * Converts a latlong to Vector3 for use in Three.js
	 */
	function latLonToVector3 (lat, lon, height) {

		height = height ? height : 0;

	  var vector3 = new THREE.Vector3(0, 0, 0);

	  lon = lon + 10;
	  lat = lat - 2;

	  var phi = PI_HALF - lat * Math.PI / 180 - Math.PI * 0.01;
	  var theta = 2 * Math.PI - lon * Math.PI / 180 + Math.PI * 0.06;
	  var rad = 600 + height;

	  vector3.x = Math.sin(phi) * Math.cos(theta) * rad;
	  vector3.y = Math.cos(phi) * rad;
	  vector3.z = Math.sin(phi) * Math.sin(theta) * rad;

	  return vector3;
	};

	/**
	 *	Adds a Tweet to the Earth, called from TweetHud.js
	 */
	TwtrGlobe.onTweet = function (tweet) {

		// extract a latlong from the Tweet object
		// console.log(tweet);
		var latlong = {
			lat: tweet.coordinates.coordinates[1],
			lon: tweet.coordinates.coordinates[0]
		};

		var position = latLonToVector3(latlong.lat, latlong.lon);

		addBeacon(position, tweet);
	}

	/**
	 *	Adds a beacon (line) to the surface of the Earth
	 */
	function addBeacon (position, tweet) {

		var beacon = new TweetBeacon(tweet);

	  beacon.position.x = position.x;
	  beacon.position.y = position.y;
	  beacon.position.z = position.z;
	  beacon.lookAt(earthMesh.position);
		beaconHolder.add(beacon);

		// remove beacon from scene when it expires itself
		beacon.onHide(function () {
			beaconHolder.remove(beacon);
		});
	}

	/**
	 * Render loop
	 */
	function animate () {
	  requestAnimationFrame(animate);
    if (stats) stats.begin();
    render();
    if (stats) stats.end();
	}

	/**
	 * Runs on each animation frame
	 */
	function render () {

		earthMesh.rotation.y = earthMesh.rotation.y + 0.005;

	  renderer.autoClear = false;
	  renderer.clear();
	  renderer.render( scene, camera );
	}

	/**
	 * Updates camera and rendered when browser resized
	 */
	function onWindowResize (event) {
		innerWidth = window.innerWidth;
		innerHeight = window.innerHeight;

	  camera.aspect = innerWidth / innerHeight;
	  camera.updateProjectionMatrix();
	  renderer.setSize(innerWidth, innerHeight);
	}

	/**
	 * Detects WebGL support
	 */
	TwtrGlobe.supportsWebGL = function () {
		return ( function () { try { var canvas = document.createElement( 'canvas' ); return !! window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ); } catch( e ) { return false; } } )();
	}

	return TwtrGlobe;

})().init();
