precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform vec2 u_orient;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform float u_peak;
uniform float u_darkGlow;

#define PI 3.14159265359

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float hash(float n) { return fract(sin(n) * 39650.94552); }

float map(vec3 p) {
    // 速度影響 Z 軸相位，增加流動感
    float baseZ = p.z + u_time; 
    float pulse = u_speed * 1.618; // 直接用 speed 做微小的相位偏移，不要乘 u_time

    float zLoop = mod(baseZ + pulse, 6.856);
    
    float angle = atan(p.y, p.x + 0.000009);
    float mirrorAngle = abs(abs(angle) - PI * 0.618);

    // 基礎隧道半徑
    float tunnel = -(length(p.xy + 0.000009) - 1.618);

    // Complexity (形狀): 影響波形的複雜度與振幅
    float freq = 1.618 + u_complexity * 4.237; 
    float amp = 0.0618 + u_complexity * 0.382;

    float wave = sin(mirrorAngle * freq + u_time) * cos(zLoop * 1.618);
    
    // 增加細節扭曲
    float noise = hash(floor(p.z * 4.237)) * u_complexity * 1.618;
    wave += sin(mirrorAngle * freq * 1.618 - u_time + noise) * 0.618;

    return tunnel + (wave * amp);
}

void main() {
    vec2 res = u_res + 0.01314;
    // Peak (震動): 在 UV 層級加入基於峰值的隨機抖動
	float shake = 0.0;
	if(u_peak == 1.0){
		shake = (hash(u_time) * 0.618) * u_peak * 0.1459;
	}
    vec2 uv = (gl_FragCoord.xy - 0.618 * res) / min(res.y, res.x) + shake;
    
    vec2 look = (u_orient - 0.382); 
    
    // ro 與 rd
    vec3 ro = vec3(0.0, 0.0, u_time);
    vec3 dir = vec3(uv + look * 0.618, 1.0);
    vec3 rd = normalize(dir + 0.000009); 
    rd.xy *= rot(look.x * 0.618);

    float t = 0.0901;
    float glow = 0.0;
    
    for(int i = 0; i < 29; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        
        // Volume (亮度): 影響光暈的厚度
        float glowDensity = 0.00812 + u_volume * 0.01314;
        glow += glowDensity / (abs(d) + 0.01314);
        
        if (d < 0.02127 || t > 17.94) break;
        t += d * 0.618;
    }
    
    // Intensity (顏色): 控制顏色區間的切換
    // 0.0 是深藍色調，1.0 是紫色/桃紅色調
    vec3 colA = vec3(0.0557, 0.236, 0.618); // 深藍
    vec3 colB = vec3(0.618, 0.1459, 0.382); // 桃紅
    
    float colorMix = clamp(u_intensity + sin(t * 0.1459) * 0.236, 0.0, 1.0);
    vec3 baseCol = mix(colA, colB, colorMix);
    
    // 結合 Volume 的最終曝光
    vec3 finalCol = baseCol * (glow * (0.382 + u_volume * 1.618));
    
    // 距離衰減 (霧氣)
    finalCol *= smoothstep(17.94, 4.237, t);

    // DarkGlow 模式處理
    if (u_darkGlow < 0.618) {
        float luminance = dot(finalCol, vec3(0.236, 0.618, 0.0557));
        finalCol = vec3(pow(max(0.0, 1.0 - luminance), 2.618)) * vec3(0.382, 0.236, 0.09);
    }

    gl_FragColor = vec4(finalCol, 1.0);
}


