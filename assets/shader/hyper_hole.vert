// hyper_hole.vert
varying vec3 vColor;
varying float vDist;
uniform float u_time;
uniform float u_volume;

void main() {
    // 取得原始位置
    vec3 p = position;
    
    // 計算到中心的距離
    float d = length(p.xy);
    vDist = d;

    // --- 真正的 3D 扭曲 ---
    // 距離中心越近，Z 軸被「吸」進去的深度越誇張
    float gravity = (1.0 / (d + 0.1)) * u_volume * 5.0;
    p.z -= gravity; 

    // 模擬音樂引起的震盪流
    p.xy *= 1.0 + sin(d * 10.0 - u_time * 2.0) * u_volume * 0.2;

    // 傳遞顏色給 Fragment
    vColor = vec3(0.5 + u_volume, 0.5, 1.0);

    // Three.js 的標準變換：這一步會自動處理「近大遠小」
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (10.0 / -mvPosition.z) * (1.0 + u_volume);
    gl_Position = projectionMatrix * mvPosition;
}