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

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.001, 1000);

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

// 创建手动测试按钮
const testButton = document.createElement('button');
testButton.textContent = '测试位置更新';
testButton.style.position = 'absolute';
testButton.style.top = '10px';
testButton.style.right = '10px';
testButton.style.padding = '10px';
testButton.style.zIndex = '1000';

testButton.addEventListener('click', () => {
    logToScreen('手动测试位置更新...');
    
    // 显示加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'gps-loading';
    loadingIndicator.textContent = '正在获取位置...';
    loadingIndicator.style.position = 'absolute';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.backgroundColor = 'rgba(0,0,0,0.7)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.padding = '20px';
    loadingIndicator.style.borderRadius = '10px';
    loadingIndicator.style.zIndex = '2000';
    document.body.appendChild(loadingIndicator);

});
// document.body.appendChild(testButton);

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

// 将地理位置获取代码移动到这里
navigator.geolocation.getCurrentPosition(position => {
    // 移除加载指示器
    if (document.getElementById('gps-loading')) {
        document.getElementById('gps-loading').remove();
    }
    logToScreen(`当前位置: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
    updateCoordinates(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
}, error => {
    // 移除加载指示器
    if (document.getElementById('gps-loading')) {
        document.getElementById('gps-loading').remove();
    }
    
    logToScreen(`GPS错误: ${error.message}, 错误代码: ${error.code}`);
    
    // 显示更详细的错误信息
    let errorMsg = '';
    switch(error.code) {
        case 1: // PERMISSION_DENIED
            errorMsg = '获取位置被拒绝，请检查浏览器位置权限设置';
            break;
        case 2: // POSITION_UNAVAILABLE
            errorMsg = '位置信息不可用，可能是GPS信号弱或设备问题';
            break;
        case 3: // TIMEOUT
            errorMsg = '获取位置超时，请尝试在开阔区域重试';
            break;
        default:
            errorMsg = '未知错误';
    }
    logToScreen(`详细错误: ${errorMsg}`);
}, {
    enableHighAccuracy: true,  // 请求高精度位置
    timeout: 30000,            // 增加到30秒超时
    maximumAge: 0              // 不使用缓存位置
});

// 添加3D Tiles渲染器
let tilesRenderer;

// 添加全局变量来保存dummyMesh引用，使其可以从外部访问
let dummyMesh;

// 创建旋转控制面板
function createRotationPanel() {
    const rotationPanel = document.createElement('div');
    rotationPanel.id = 'rotation-panel';
    rotationPanel.style.position = 'absolute';
    rotationPanel.style.bottom = '180px';
    rotationPanel.style.left = '10px';
    rotationPanel.style.right = '10px';
    rotationPanel.style.backgroundColor = 'rgba(0,50,100,0.8)';
    rotationPanel.style.color = 'white';
    rotationPanel.style.padding = '15px';
    rotationPanel.style.fontSize = '14px';
    rotationPanel.style.borderRadius = '8px';
    rotationPanel.style.zIndex = '1000';
    
    // 创建标题
    const title = document.createElement('div');
    title.textContent = '模型旋转控制';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.textAlign = 'center';
    rotationPanel.appendChild(title);
    
    // 创建X轴旋转控制
    const xRotationContainer = document.createElement('div');
    xRotationContainer.style.marginBottom = '10px';
    
    const xLabel = document.createElement('label');
    xLabel.textContent = 'X轴旋转: ';
    xLabel.htmlFor = 'x-rotation';
    xRotationContainer.appendChild(xLabel);
    
    const xValue = document.createElement('span');
    xValue.id = 'x-rotation-value';
    xValue.textContent = '0°';
    xValue.style.marginLeft = '5px';
    xRotationContainer.appendChild(xValue);
    
    const xSlider = document.createElement('input');
    xSlider.type = 'range';
    xSlider.id = 'x-rotation';
    xSlider.min = '-180';
    xSlider.max = '180';
    xSlider.value = '0';
    xSlider.style.width = '100%';
    xSlider.style.marginTop = '5px';
    xSlider.addEventListener('input', () => {
        const value = xSlider.value;
        xValue.textContent = `${value}°`;
        if (dummyMesh) {
            dummyMesh.rotation.x = THREE.MathUtils.degToRad(parseFloat(value));
        }
    });
    xRotationContainer.appendChild(xSlider);
    rotationPanel.appendChild(xRotationContainer);
    
    // 创建Y轴旋转控制
    const yRotationContainer = document.createElement('div');
    yRotationContainer.style.marginBottom = '10px';
    
    const yLabel = document.createElement('label');
    yLabel.textContent = 'Y轴旋转: ';
    yLabel.htmlFor = 'y-rotation';
    yRotationContainer.appendChild(yLabel);
    
    const yValue = document.createElement('span');
    yValue.id = 'y-rotation-value';
    yValue.textContent = '0°';
    yValue.style.marginLeft = '5px';
    yRotationContainer.appendChild(yValue);
    
    const ySlider = document.createElement('input');
    ySlider.type = 'range';
    ySlider.id = 'y-rotation';
    ySlider.min = '-180';
    ySlider.max = '180';
    ySlider.value = '0';
    ySlider.style.width = '100%';
    ySlider.style.marginTop = '5px';
    ySlider.addEventListener('input', () => {
        const value = ySlider.value;
        yValue.textContent = `${value}°`;
        if (dummyMesh) {
            dummyMesh.rotation.y = THREE.MathUtils.degToRad(parseFloat(value));
        }
    });
    yRotationContainer.appendChild(ySlider);
    rotationPanel.appendChild(yRotationContainer);
    
    // 创建Z轴旋转控制
    const zRotationContainer = document.createElement('div');
    
    const zLabel = document.createElement('label');
    zLabel.textContent = 'Z轴旋转: ';
    zLabel.htmlFor = 'z-rotation';
    zRotationContainer.appendChild(zLabel);
    
    const zValue = document.createElement('span');
    zValue.id = 'z-rotation-value';
    zValue.textContent = '0°';
    zValue.style.marginLeft = '5px';
    zRotationContainer.appendChild(zValue);
    
    const zSlider = document.createElement('input');
    zSlider.type = 'range';
    zSlider.id = 'z-rotation';
    zSlider.min = '-180';
    zSlider.max = '180';
    zSlider.value = '0';
    zSlider.style.width = '100%';
    zSlider.style.marginTop = '5px';
    zSlider.addEventListener('input', () => {
        const value = zSlider.value;
        zValue.textContent = `${value}°`;
        if (dummyMesh) {
            dummyMesh.rotation.z = THREE.MathUtils.degToRad(parseFloat(value));
        }
    });
    zRotationContainer.appendChild(zSlider);
    rotationPanel.appendChild(zRotationContainer);
    
    // 创建旋转重置按钮
    const resetButton = document.createElement('button');
    resetButton.textContent = '重置旋转';
    resetButton.style.width = '100%';
    resetButton.style.marginTop = '10px';
    resetButton.style.padding = '8px';
    resetButton.style.backgroundColor = '#007bff';
    resetButton.style.border = 'none';
    resetButton.style.borderRadius = '4px';
    resetButton.style.color = 'white';
    resetButton.style.cursor = 'pointer';
    resetButton.addEventListener('click', () => {
        if (dummyMesh) {
            dummyMesh.rotation.set(0, 0, 0);
            xSlider.value = '0';
            ySlider.value = '0';
            zSlider.value = '0';
            xValue.textContent = '0°';
            yValue.textContent = '0°';
            zValue.textContent = '0°';
        }
    });
    rotationPanel.appendChild(resetButton);
    
    document.body.appendChild(rotationPanel);
    
    return rotationPanel;
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
        const dummyGeometry = new THREE.BoxGeometry(100,100,100);
        const dummyMaterial = new THREE.MeshBasicMaterial({
            visible: false
        });
        // 将局部变量改为使用全局变量
        dummyMesh = new THREE.Mesh(dummyGeometry, dummyMaterial);
        dummyMesh.rotation.x = THREE.MathUtils.degToRad(-30);
        
        // 将3D Tiles添加为子对象
        dummyMesh.add(tilesRenderer.group);
        
        // 现在可以使用locar.add添加这个mesh到指定GPS位置
        // locar.add(dummyMesh, 104.06278, 30.538563);
        locar.add(dummyMesh, coords.longitude, coords.latitude);
        
        logToScreen('3D Tiles加载完成并添加到GPS位置');
        
        // 创建旋转控制面板
        // createRotationPanel();
    });
}

locar.on("gpsupdate", (pos, distMoved) => {
    locar.setElevation(pos.coords.altitude)
    // locar.setElevation(1000)
    logToScreen(`GPS位置更新: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
    
    // 更新坐标显示面板
    updateCoordinates(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    
    if(firstLocation) {
        setupTilesRenderer(pos.coords);

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
