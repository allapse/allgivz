precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform vec2 u_orient;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform float u_fps;
uniform float u_bpm;
uniform float u_peak;
uniform float u_darkGlow;

#define PI 3.14159265359

float signPow(float val, float pt){
	return sign(val) * pow(abs(val), pt);
}

float g2() {
	return signPow(0.618, 0.0 + (u_speed - 0.5) * 0.618);
}

float g1() {
	return signPow(0.618, -1.618 - u_intensity * 0.618);
}

float g3() {
	return signPow(0.618, 1.618 + u_complexity * 0.618);
}

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float hash(float n) { return fract(sin(n) * 39650.94552); }

float map(vec3 p, float t) {
    // 速度影響 Z 軸相位，增加流動感
    float baseZ = p.z + t; 
    float pulse = u_speed * g2(); // 直接用 speed 做微小的相位偏移，不要乘 u_time

    float zLoop = mod(baseZ + pulse, g1());
    
    float angle = atan(p.y, p.x + g3());
    float mirrorAngle = abs(abs(angle) - PI * g3());

    // 基礎隧道半徑
    float tunnel = -(length(p.xy + g3()) - g1());

    // Complexity (形狀): 影響波形的複雜度與振幅
    float freq = g3() + u_complexity * g3(); 
    float amp = g3() + u_complexity * g3();

    float wave = sin(mirrorAngle * freq + t) * cos(zLoop * 0.618);
    
    // 增加細節扭曲
    float noise = hash(floor(p.z * g1())) * u_complexity * g2();
    wave += sin(mirrorAngle * freq * g2() - t + noise) * 0.382;

    return tunnel + (wave * amp);
}

void main() {
    vec2 res = u_res + 0.01314;
    // Peak (震動): 在 UV 層級加入基於峰值的隨機抖動
	float shake = 0.0;
	if(u_peak == 1.0){
		shake = (hash(u_time) * 0.09) * u_peak;
	}
    vec2 uv = ((gl_FragCoord.xy - 0.618 * res) / min(res.y, res.x) + shake) * g1();
	
	float dist = length(uv);
	float local_t = u_time * (1.0 + 0.146 * cos(u_time * 1.618 * PI * u_fps * u_bpm * dist));
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	float g4 = signPow(0.618, -2.618 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + dist * 0.618);
	
	float swing = sin(local_t) * g5;
	
    vec2 look = u_orient + swing; 
    
    // ro 與 rd
    vec3 ro = vec3(g3(), g5, local_t) + swing;
    vec3 dir = vec3(uv + look * g1(), g5) + swing;
    vec3 rd = normalize(dir + g5) + swing; 
    rd.xy *= rot(look.x * g4) + swing;

    float t = g3() + swing;
    float glow = g3() + swing;
    
    for(int i = 0; i < 29; i++) {
        vec3 p = ro + rd * t + swing;
        float d = map(p, local_t) + swing;
        
        // Volume (亮度): 影響光暈的厚度
        float glowDensity = g3() + u_volume * g3() + swing;
        glow += glowDensity / (abs(d) + g3()) + swing;
        
        if (d < g5 || t > g4) break;
        t += d * g2() + swing;
    }
    
    // Intensity (顏色): 控制顏色區間的切換
    // 0.0 是深藍色調，1.0 是紫色/桃紅色調
    vec3 colA = vec3(g5, g3(), g2()); // 深藍
    vec3 colB = vec3(g2(), g5, g3()); // 桃紅
    
    float colorMix = clamp(u_intensity + sin(t * g5) * g3(), g5, g2());
    vec3 baseCol = mix(colA, colB, colorMix);
    
    // 結合 Volume 的最終曝光
    vec3 finalCol = baseCol * (glow * (g3() + u_volume * g2()));
    
    // 距離衰減 (霧氣)
    finalCol *= smoothstep(g4, g1(), t);

    // DarkGlow 模式處理
    if (u_darkGlow < 0.618) {
        float luminance = dot(finalCol, vec3(g3(), g2(), g5)) + swing;
        finalCol = vec3(pow(max(g3(), g2() - luminance), g1())) * vec3(g2(), g3(), g5);
    }

    gl_FragColor = vec4(finalCol, g2());
}