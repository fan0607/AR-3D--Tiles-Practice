import * as THREE from 'three';
import * as LocAR from 'locar';
import { TilesRenderer } from '3d-tiles-renderer';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'

// 创建屏幕调试面板
function createDebugPanel() {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.position = 'absolute';
    debugPanel.style.bottom = '10px';
    debugPanel.style.left = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.backgroundColor = 'rgba(0,0,0,0.7)';
    debugPanel.style.color = 'white';
    debugPanel.style.padding = '10px';
    debugPanel.style.fontSize = '12px';
    debugPanel.style.maxHeight = '150px';
    debugPanel.style.overflowY = 'auto';
    debugPanel.style.zIndex = '1000';
    document.body.appendChild(debugPanel);
    
    return debugPanel;
}

// 创建坐标显示面板
function createCoordinatesPanel() {
    const coordPanel = document.createElement('div');
    coordPanel.id = 'coord-panel';
    coordPanel.style.position = 'absolute';
    coordPanel.style.top = '10px';
    coordPanel.style.left = '10px';
    coordPanel.style.backgroundColor = 'rgba(0,0,100,0.8)';
    coordPanel.style.color = 'white';
    coordPanel.style.padding = '10px';
    coordPanel.style.fontSize = '16px';
    coordPanel.style.fontWeight = 'bold';
    coordPanel.style.borderRadius = '5px';
    coordPanel.style.zIndex = '1000';
    coordPanel.style.maxWidth = '50%';
    coordPanel.style.textShadow = '1px 1px 2px black';
    coordPanel.textContent = '等待位置信息...';
    document.body.appendChild(coordPanel);
    
    return coordPanel;
}

// 更新坐标显示
function updateCoordinates(lat, lng, accuracy) {
    const coordPanel = document.getElementById('coord-panel') || createCoordinatesPanel();
    coordPanel.innerHTML = `
        <div>纬度: ${lat.toFixed(6)}°</div>
        <div>经度: ${lng.toFixed(6)}°</div>
        ${accuracy ? `<div>精度: ±${accuracy.toFixed(2)}米</div>` : ''}
    `;
}

// 向调试面板添加日志
function logToScreen(message) {
    const debugPanel = document.getElementById('debug-panel') || createDebugPanel();
    const logEntry = document.createElement('div');
    logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    debugPanel.appendChild(logEntry);
    debugPanel.scrollTop = debugPanel.scrollHeight;
    
    // 同时也输出到控制台（开发时可见）
    console.log(message);
}

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.0001, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// 添加坐标轴辅助对象
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// 添加环境光，使模型可见
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// 添加平行光，增强模型可见性
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 10, 10);
scene.add(directionalLight);

// 添加透视网格，帮助判断空间位置
const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

// 创建调试面板
createDebugPanel();
// 创建坐标显示面板
createCoordinatesPanel();
logToScreen('应用启动...');

const locar = new LocAR.LocationBased(scene, camera);

// 添加GPS错误处理
locar.on("gpserror", (error) => {
    logToScreen(`GPS错误: ${error.message}`);
    // 显示用户友好的错误消息
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '10px';
    errorDiv.style.left = '10px';
    errorDiv.style.padding = '10px';
    errorDiv.style.backgroundColor = 'rgba(255,0,0,0.7)';
    errorDiv.style.color = 'white';
    errorDiv.textContent = '无法获取位置信息，请确保已授予位置权限。';
    document.body.appendChild(errorDiv);
});

// 启动GPS
logToScreen("正在启动GPS...");
locar.startGps();

window.addEventListener("resize", e => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

const cam = new LocAR.WebcamRenderer(renderer);

let firstLocation = true;

const deviceOrientationControls = new LocAR.DeviceOrientationControls(camera);

// 检查设备方向权限
if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
    // iOS 13+ 需要请求权限
    const orientationButton = document.createElement('button');
    orientationButton.textContent = '启用设备方向';
    orientationButton.style.position = 'absolute';
    orientationButton.style.top = '60px';
    orientationButton.style.right = '10px';
    orientationButton.style.padding = '10px';
    orientationButton.style.zIndex = '1000';
    orientationButton.addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    logToScreen('设备方向权限已获取');
                    window.addEventListener('deviceorientation', deviceOrientationControls.onDeviceOrientationChangeEvent);
                } else {
                    logToScreen('设备方向权限被拒绝');
                }
            })
            .catch(error => logToScreen(`设备方向错误: ${error}`));
    });
    document.body.appendChild(orientationButton);
}

// 添加3D Tiles渲染器
let tilesRenderer;

// 添加全局变量来保存dummyMesh引用，使其可以从外部访问
let dummyMesh;

const fixedTilesLocation = {
    longitude: 0,
    latitude: 0
}

// 创建大小控制面板
function createScalePanel() {
    const scalePanel = document.createElement('div');
    scalePanel.id = 'scale-panel';
    scalePanel.style.position = 'absolute';
    scalePanel.style.bottom = '180px';
    scalePanel.style.right = '10px';
    scalePanel.style.backgroundColor = 'rgba(0,100,50,0.8)';
    scalePanel.style.color = 'white';
    scalePanel.style.padding = '10px';
    scalePanel.style.fontSize = '14px';
    scalePanel.style.borderRadius = '5px';
    scalePanel.style.zIndex = '1000';
    
    const title = document.createElement('div');
    title.textContent = '模型大小调整';
    title.style.marginBottom = '10px';
    scalePanel.appendChild(title);
    
    const scaleValue = document.createElement('span');
    scaleValue.id = 'scale-value';
    scaleValue.textContent = '1.0';
    scalePanel.appendChild(scaleValue);
    
    const scaleSlider = document.createElement('input');
    scaleSlider.type = 'range';
    scaleSlider.min = '0.1';
    scaleSlider.max = '20';
    scaleSlider.step = '0.1';
    scaleSlider.value = '1';
    scaleSlider.style.width = '100%';
    scaleSlider.addEventListener('input', () => {
        const value = parseFloat(scaleSlider.value);
        scaleValue.textContent = value.toFixed(1);
        if (dummyMesh) {
            dummyMesh.scale.set(value, value, value);
        }
    });
    scalePanel.appendChild(scaleSlider);
    
    document.body.appendChild(scalePanel);
    return scalePanel;
}

function setupTilesRenderer(coords) {
    // 创建TilesRenderer实例
    logToScreen('开始加载3D Tiles...');
    tilesRenderer = new TilesRenderer('https://kc3.kcgis.cn:30011/3dtiled/e/2024/yz/DK1_z/tileset.json');

    // 配置 DRACO 加载器
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    
    // 配置 GLTF 加载器
    const loader = new GLTFLoader(tilesRenderer.manager);
    loader.setDRACOLoader(dracoLoader);

    // 为 gltf/glb 文件添加处理器
    tilesRenderer.manager.addHandler(/\.(gltf|glb)$/i, loader);

    // 配置 KTX2 加载器
    const ktx2Loader = new KTX2Loader()
      .setTranscoderPath('/basis/') 
      .detectSupport(renderer);
    
    loader.setKTX2Loader(ktx2Loader);

    tilesRenderer.manager.addHandler(/\.(ktx2)$/i, ktx2Loader);


    
    // 设置相机和分辨率
    tilesRenderer.setCamera(camera);
    tilesRenderer.setResolutionFromRenderer(camera, renderer);
    
    // 监听模型加载完成事件
    tilesRenderer.addEventListener('load-tile-set', () => {
        const sphere = new THREE.Sphere();
        tilesRenderer.getBoundingSphere(sphere);
        const matrix = new THREE.Matrix4();
        matrix.makeTranslation(-sphere.center.x, -sphere.center.y, -sphere.center.z);
        tilesRenderer.group.applyMatrix4(matrix);
        
        // 创建一个空的网格作为容器
        const dummyGeometry = new THREE.BoxGeometry(1,1,1);
        const dummyMaterial = new THREE.MeshBasicMaterial({
            visible: false
        });
        // 将局部变量改为使用全局变量
        dummyMesh = new THREE.Mesh(dummyGeometry, dummyMaterial);
        dummyMesh.rotation.x = THREE.MathUtils.degToRad(-30);
        
        // 调整3D Tiles的显示大小
        // dummyMesh.scale.set(5, 5, 5);
        
        // 将3D Tiles添加为子对象
        dummyMesh.add(tilesRenderer.group);
        
        // 现在可以使用locar.add添加这个mesh到指定GPS位置
        // locar.add(dummyMesh, 104.06278, 30.538563);
        locar.add(dummyMesh, coords.longitude, coords.latitude);
        
        logToScreen('3D Tiles加载完成并添加到GPS位置');
        
        // 创建大小调整面板
        createScalePanel();
    });
}

locar.on("gpsupdate", (pos, distMoved) => {
    // locar.setElevation(pos.coords.altitude)
    locar.setElevation(0)
    logToScreen(`GPS位置更新: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}, ${distMoved}`);
    
    // 更新坐标显示面板
    updateCoordinates(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    
    if(firstLocation) {
        setupTilesRenderer(pos.coords);
        fixedTilesLocation.longitude = pos.coords.longitude;
        fixedTilesLocation.latitude = pos.coords.latitude;
        firstLocation = false;
        logToScreen("标记物体添加完成");
    }
});

// 检查GPS状态计时器
let gpsCheckCount = 0;
const gpsStatusTimer = setInterval(() => {
    gpsCheckCount++;
    if (gpsCheckCount > 10) {
        logToScreen("10秒内未收到GPS更新，GPS可能未正常工作");
        const coordPanel = document.getElementById('coord-panel');
        if (coordPanel && coordPanel.textContent === '等待位置信息...') {
            coordPanel.style.backgroundColor = 'rgba(255,0,0,0.8)';
            coordPanel.textContent = 'GPS未响应，请检查权限或点击测试按钮';
        }
        clearInterval(gpsStatusTimer);
    }
}, 1000);

renderer.setAnimationLoop(animate);

function animate() {
    cam.update();
    deviceOrientationControls.update();
    
    // 更新3D Tiles
    if (tilesRenderer) {
        camera.updateMatrixWorld();
        tilesRenderer.update();
    }
    
    renderer.render(scene, camera);
}
