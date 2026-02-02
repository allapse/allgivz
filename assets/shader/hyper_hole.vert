attribute float a_id;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform sampler2D u_camera; // 準備接入相機
uniform float u_useCamera;
uniform float u_darkGlow;      // 暗部輝光強度 (0~1)

varying float vDist;
varying float vAlpha;
varying vec3 vColor;
varying vec2 vUv;
varying float vMode; // 傳遞開關狀態

float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
	vMode = u_darkGlow;
    float s1 = hash(a_id);
    float s2 = hash(a_id + 0.12);
    float s3 = hash(a_id + 0.34);
    
    // 1. 生命週期：保底速度，不讓畫面靜止
    float baseSpeed = (0.05 + s1 * 0.1) * (0.5 + u_speed);
    float life = mod(u_time + s2, 1.0);
    float pull = pow(life, 2.0); 

    // 2. 初始半徑：保底大小 0.3，避免 volume=0 時消失
    float radiusRange = 5.0 + u_intensity * 1.0;
    float startRadius = (0.2 + s1 * radiusRange);
    float currentRadius = startRadius * (1.0 - pull);

    // 3. 旋轉：即使沒有音樂也維持開普勒旋轉
    float baseAngle = s2 * 6.283185;
    float twist = (u_complexity * 3.0 + 1.0) / (currentRadius + 0.1);
	float chaos = u_darkGlow * sin(u_time * 2.0 + s1 * 10.0) * 0.5;
    float orbit = (u_time * (u_speed + 0.2) * 1.5) + twist + (s3 * 15.0);
    float finalAngle = baseAngle + orbit + chaos;

    // 4. 座標構建
    vec3 p;
    p.x = cos(finalAngle) * currentRadius;
    p.y = sin(finalAngle) * currentRadius;
    
    // 5. Z 軸震盪：保底微動
    float wave = sin(currentRadius * 10.0 - u_time * 2.0) * (u_peak + 0.02) * 0.1;
    float thickness = (pow(s3, 3.0) - 0.5) * currentRadius * 0.2;
    p.z = thickness + wave;

    // 6. 傾斜 45 度
    float rad = 0.785398;
    float c = cos(rad); float s = sin(rad);
    float oldY = p.y;
    p.y = oldY * c - p.z * s;
    p.z = oldY * s + p.z * c;

    // 7. 假透視 (Z=1 相機)
    p.z -= 0.6;
    float perspective = 1.2 / (1.0 - p.z);
    p.xy *= perspective;

    // --- 準備 UV 用於採樣相機 ---
    // 將 p.xy 的 (-1~1) 映射到 (0~1)
    vUv = p.xy * 0.5 + 0.5;

    vDist = currentRadius;
    vAlpha = (1.0 - pull) * smoothstep(0.0, 0.1, life);
    
    // 6. 顏色模式切換 (u_darkGlow)
    // 模式 0: 冷色調藍色 | 模式 1: 熾熱橙紅色
    vec3 color0 = mix(vec3(0.1, 0.4, 1.0), vec3(0.0, 0.1, 0.5), s1);
    vec3 color1 = mix(vec3(1.0, 0.3, 0.1), vec3(0.5, 0.0, 0.0), s1);
    vColor = mix(color0, color1, u_darkGlow);

    gl_Position = vec4(p.x, p.y, 0.0, 1.0);
    
    // 8. 點的大小：保底尺寸 2.0，確保看得見
    gl_PointSize = (3.0 + u_volume_smooth * 16.0 + s2 * 6.0) * perspective;
    gl_PointSize = clamp(gl_PointSize, 1.0, 30.0);
}
