precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform vec2 u_orient;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform float u_darkGlow;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}
// 簡易雜訊函式：用來打碎分割線的規律感
float hash(float n) { return fract(sin(n) * 43758.5453123); }
// 定義常數 PI
#define PI 3.14159265359

float map(vec3 p) {
    // 修正：確保 zLoop 與 ro 的運動邏輯一致
    float zLoop = mod(p.z, 6.28318); 
    float timeMod = u_time * (u_speed * 2.0 + 1.0);
    
    // --- 鏡像處理 (消除分割線的核心) ---
    // --- 兩倍鏡像 (萬花筒效果) ---
    float angle = atan(p.y, p.x); // 範圍 -PI ~ PI
    
    // 第一次折疊：左右對稱
    float mirrorAngle = abs(angle); 
    
    // 第二次折疊：上下對稱
    // 我們將角度限制在 0 ~ PI/2 之間，然後再做一次 abs
    // 這樣 0~90, 90~180, 0~-90, -90~-180 看起來都會一模一樣
    mirrorAngle = abs(mirrorAngle - PI * 0.5);
    
    // 1. 基礎隧道
    float tunnel = -(length(p.xy) - (1.6 + u_volume * 0.4)); 
    
    // 2. 扭曲邏輯 (鏡像 + Noise 重疊)
    // 確保 freq 是偶數或整數會更穩定，但有了鏡像後非整數也沒關係了
    float freq = 0.05 + u_intensity * 3.0; 
    float amp = 0.02 + u_complexity * 0.01; 

    // 第一層：主波紋 (使用鏡像角度)
    float wave = sin(mirrorAngle * freq + timeMod) * cos(zLoop * 2.0);
    
    // 第二層：Noise 疊加 (用來模糊接縫處的生硬感)
    // 利用 p.z 加入一點隨機擾動
    float noise = hash(floor(p.z * 5.0)) * u_complexity * 2.0;
    wave += sin(mirrorAngle * (freq * 1.5) - timeMod + noise) * 0.5;
    
    // 縱向波紋 (保持不變)
    wave += sin(zLoop * 5.0 + timeMod) * 0.3;
    
    return tunnel + (wave * amp);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / (min(u_res.y, u_res.x) + 0.001) * 5.0;
    
    // 修正：將 u_orient 轉為 -1 到 1 的範圍，並減小權重
    vec2 look = (u_orient)*2.0; 
    
    // 3. 設定相機 (ro.z 也取模，保持在小範圍運動)
    float travel = u_time * (u_speed * 2.0 + 1.0);
    vec3 ro = vec3(0.0, 0.0, mod(travel, 6.28318));
    
    // 4. 設定射線：確保 z (1.5) 足夠強，look 不要偏移太誇張
    vec3 rd = normalize(vec3(uv + look * 0.1, 1.5)); 
    
    // 側翻效果
    rd.xy *= rot(look.x * 0.3);

    float t = 0.0;
    float glow = 0.0;
    
    // 5. 步進優化
    for(int i = 0; i < 12; i++) { // 增加到 40 次讓細節出來
        vec3 p = ro + rd * t;
        float d = map(p);
        
        // 累積亮度
        glow += 0.02 / (abs(d) + 0.02);
        
        // 限制最大步進距離
        if (d < 0.002 || t > 20.0) break;
        t += d * 0.6; // 0.6 是安全係數，防止穿透
    }
    
    // 6. 著色
    vec3 baseCol = mix(vec3(0.1, 0.4, 0.8), vec3(0.6, 0.1, 0.8), sin(t * 0.2 + u_time) * 0.5 + 0.5);
    
    // 基礎亮度保證：即使 volume 為 0 也要有光
    vec3 finalCol = baseCol * (glow * (0.3 + u_volume * 0.7));
    
    // 霧氣：讓遠處漸隱
    finalCol = mix(finalCol, vec3(0.01, 0.02, 0.05), smoothstep(2.0, 15.0, t));

    // 7. DarkGlow 
    if (u_darkGlow > 0.5) {
        float luminance = dot(finalCol, vec3(0.0722, 0.7152, 0.2126));
        finalCol = vec3(pow(1.0 - luminance, 2.5)) * vec3(0.6, 0.6, 0.0);
    }

    gl_FragColor = vec4(finalCol, 1.0);
}
