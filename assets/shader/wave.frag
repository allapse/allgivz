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
    // 1. 統一對 Z 軸取模，確保手機精確度
    float zLoop = mod(p.z, 6.28318); 
    float timeMod = u_time * (u_speed * 2.0 + 1.0);
    
    float angle = atan(p.y, p.x);
    float mirrorAngle = abs(angle); 
    mirrorAngle = abs(mirrorAngle - PI * 0.5);
    
    // 2. 稍微加大隧道半徑，給相機空間
    float tunnel = -(length(p.xy) - (1.8 + u_volume * 0.5)); 
    
    // 3. 加大 amp，讓扭曲變明顯，手機才看得到細節
    float freq = 2.0 + u_intensity * 10.0; 
    float amp = 0.05 + u_complexity * 0.3; // 這裡加大了

    float wave = sin(mirrorAngle * freq + timeMod) * cos(zLoop * 2.0);
    float noise = hash(floor(p.z * 5.0)) * u_complexity;
    wave += sin(mirrorAngle * (freq * 1.5) - timeMod + noise) * 0.5;
    
    return tunnel + (wave * amp);
}

void main() {
    // 修正：移除 * 5.0，恢復正常視角
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / (min(u_res.y, u_res.x) + 0.001);
    
    // 修正：look 不要乘太大
    vec2 look = (u_orient - 0.5) * 1.0; 
    
    // 修正：ro 不要取 mod，讓它一直增加 (手機更穩定)
    vec3 ro = vec3(0.0, 0.0, u_time * (u_speed * 3.0 + 1.5));
    
    // 修正：rd 的 Z 軸設為 1.0 ~ 1.5
    vec3 rd = normalize(vec3(uv + look, 1.2)); 
    rd.xy *= rot(look.x * 0.5);

    float t = 0.0;
    float glow = 0.0;
    
    // 4. 增加步進次數：12 次太少了，手機至少要 30 次才會有東西
    for(int i = 0; i < 32; i++) { 
        vec3 p = ro + rd * t;
        float d = map(p);
        glow += 0.015 / (abs(d) + 0.015);
        
        if (d < 0.01 || t > 20.0) break; // 手機判斷距離調鬆一點 (0.01)
        t += d * 0.5; 
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
