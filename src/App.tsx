import React, { useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';

const ThreeApp: React.FC = () => {
  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.setClearColor(0x000000);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    const params = {
      red: 1.0,
      green: 1.0,
      blue: 1.0,
      threshold: 0.5,
      strength: 0.5,
      radius: 0.8,
    };

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        params.strength,
        params.radius,
        params.threshold
    );

    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    const outputPass = new OutputPass();
    bloomComposer.addPass(outputPass);

    camera.position.set(0, -2, 14);
    camera.lookAt(0, 0, 0);

    const uniforms = {
      u_time: { value: 0.0 },
      u_frequency: { value: 0.0 },
      u_red: { value: 1.0 },
      u_green: { value: 1.0 },
      u_blue: { value: 1.0 },
    };

    const vertexShaderElement = document.getElementById('vertexshader') as HTMLScriptElement;
    const fragmentShaderElement = document.getElementById('fragmentshader') as HTMLScriptElement;

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertexShaderElement?.textContent || '',
      fragmentShader: fragmentShaderElement?.textContent || '',
    });

    const geo = new THREE.IcosahedronGeometry(4, 30);
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    (mesh.material as THREE.ShaderMaterial).wireframe = true;

    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.Audio(listener);

    const handleStream = (stream: MediaStream) => {
      const audioContext = listener.context;
      const source = audioContext.createMediaStreamSource(stream);
      sound.setNodeSource(source as unknown as AudioBufferSourceNode); // Hack to fix type mismatch
      sound.setVolume(0.5);
    };

    const resumeAudioContext = () => {
      if (listener.context.state === 'suspended') {
        listener.context.resume();
      }
      window.removeEventListener('click', resumeAudioContext);
    };

    window.addEventListener('click', resumeAudioContext);

    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    })
        .then(handleStream)
        .catch((err) => {
          console.error('Error accessing microphone:', err);
        });

    const analyser = new THREE.AudioAnalyser(sound, 32);

    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', function (e) {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (e.clientX - windowHalfX) / 100;
      mouseY = (e.clientY - windowHalfY) / 100;
    });

    const clock = new THREE.Clock();

    const animate = () => {
      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.5;
      camera.lookAt(scene.position);
      uniforms.u_time.value = clock.getElapsedTime();
      uniforms.u_frequency.value = analyser.getAverageFrequency();
      bloomComposer.render();
      requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      bloomComposer.setSize(window.innerWidth, window.innerHeight);
    });

    return () => {
      document.body.removeChild(renderer.domElement);
    };
  }, []);

  return (
      <div>
        {/* You can place any HTML elements here */}
      </div>
  );
};

export default ThreeApp;
