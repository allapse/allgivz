// hyper_hole.frag 改良版
precision highp float;
varying float vDist; // 頂點傳過來的距離
uniform float u_volume;

void main() {
    // 1. 讓點變成圓形，邊緣模糊 (Soft Particles)
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    
    // 2. 亮度控制：距離中心越近越亮，且隨音量跳動
    float strength = 0.05 / (d + 0.1); 
    
    // 3. 顏色衰減：不要讓整顆星都是純白
    vec3 color = vec3(0.5, 0.7, 1.0) * strength;
    
    // 4. 透明度是關鍵：讓點可以互相「透」過去，才不會炸掉
    float alpha = smoothstep(0.5, 0.0, d) * 0.5; // 0.5 是最大透明度
    
    gl_FragColor = vec4(color, alpha);
}