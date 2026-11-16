precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;        // 即時音量 (通常 0~1)
uniform float u_volume_smooth; // 平滑音量
uniform float u_peak;          // 最近峰值 (可當作「爆點」觸發)
uniform vec2 u_orient;         // 可能螢幕方向或長寬比相關
uniform float u_intensity;     // 整體強度倍率
uniform float u_complexity;    // 複雜度 (可控制細節層數或扭曲力度)
uniform float u_speed;         // 整體動態速度
uniform float u_darkGlow;      // 暗部輝光強度 (0~1)
uniform sampler2D u_camera;
uniform float u_useCamera;

#define PI 3.14159265359
#define TAU 6.28318530718

float signPow(float val, float pt){
	return sign(val) * pow(abs(val), pt);
}

float g2() {
	return signPow(0.618, 0.0 + (u_speed - 0.5) * 0.618);
}

float g1() {
	return signPow(0.618, -2.0 - u_intensity * 0.618);
}

float g3() {
	return signPow(0.618, 2.0 + u_complexity * 0.618);
}

float hash11(float p) {
    return fract(sin(p * 843.65) * 39650.94552);
}

mat3 rotateX(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(g1(), 0.0, 0.0, 0.0, c, s,  0.0, -s, c); 
}

mat3 rotateY(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(c, 0.0, -s, 0.0, g1(), 0.0, s, 0.0, c); 
}

void main() {
    // 基礎座標校正
    vec2 uv = gl_FragCoord.xy / u_res.xy;
	
	float g4 = signPow(0.618, -3.0 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 3.0 + abs(uv.y) * 0.618);
	
    vec3 p = vec3(uv - g3(), g3());
    p.x *= u_res.x / u_res.y; // 修正比例
	mat3 rot = rotateY(u_orient.x + u_time * 0.09) * rotateX(u_orient.y + u_time * 0.236);
	p *= rot;
	
    // 設定模擬的 Z 軸深度 (givz)
    // 這裡我們把 givz 當作一個動態的深度基礎
    float givz = g4 - (g5 + signPow(u_complexity * g2(), g1())) * g4;
    
    float t = u_time * 0.236;
    float vol = u_volume;
    float peak = u_peak;
    float intensity = u_intensity * (g3() + vol * g2() + peak * g2());
	
	// 2. lift to 4D
	vec4 v = vec4(p, givz);
	
	float a = t * 0.618 + vol;
	float c = cos(a), s = sin(a); 
	mat4 rotZW = mat4(
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0,  c, -s,
		0, 0,  s,  c
	);

	// 3. rotate in high-dim plane
	v = rotZW * v;

	// 4. non-linear projection
	p *= v.xyz / (-g2() + abs(v.z));

	float w = t * 0.618 + vol;
	float field = sin(p.x * g4 + p.y * g1() + givz * g2() + w);
	p += normalize(p) * field * g5 / (g2() + abs(sin(t + vol)));

    
    // ─── 扭曲底層座標 ────────────────────────────────────────
    float angle = atan(p.x/givz, p.y/givz);
    float dist = length(p)/givz;
    
    // 低頻驅動的放射狀波紋 + 旋轉
    float wave = sin(dist * g4 - t * g5 + vol * g1()) * g2() + g3();
    float swirl = sin(angle * g4 + t + vol * g1()) * g5 * u_complexity;
    
    p += vec3(cos(angle + t * g3()), sin(angle - t * g2()), cos(angle + t * g3())) * dist * g5 * vol;
    p *= g2() + vol * g5 + peak * g3();
    p *= vec3(cos(swirl), sin(swirl), sin(wave)) * dist + p * (g2() + peak * g5);
    
    // ─── 多層圓形/環狀結構 ───────────────────────────────────
    vec3 col = vec3(0.0);
    float accum = 0.0;
    
    for(float i = 1.0; i <= 123.1; i++) {
        float fi = signPow(i/ 47.0, g2()) ;
        float radius = g5 + fi + vol * g5;
        
        float d = length(p * (g2() + fi * g3() * u_complexity));
        float ring = smoothstep(g5 * g5 * g5, 0.0, abs(d - radius));
        
        float pulse = sin(t * (g2() + fi * 1.618) + fi * TAU * 0.618) * 0.618 + 0.382;
        pulse = mix(pulse, 1.0, peak * 0.618);
        
        vec3 hue = g2() + g3() * cos(TAU * vec3(0.0, g3(), g1()) + fi * g4 + t * 0.382);
        hue *= (g3() + vol * 1.2);
        
        float glow = ring * (g3() + pulse * g2()) * (g1() - fi * g5);
        glow *= (1.0 + peak * g1() * (1.0 - fi));
        
        col += hue * glow * intensity * (g3() + vol * g2());
        accum += glow;
    }
    
    // ─── 中心亮點 + 暗部輝光補償 ─────────────────────────────
    float core = smoothstep(g3(), g5, length(p));
    core *= (g2() + vol * g1() + peak * g4);
    col += vec3(g1(), g2(), g3()) * core * intensity * g2() * u_darkGlow;
    
    // 整體暗部輝光（u_darkGlow 控制）
    col += vec3(g3(), g5, g2()) * accum * u_darkGlow * g1();
    
    // ─── 選用 camera 作為底圖（可調透明度）────────────────────
    if(u_useCamera > 0.618) {
        vec2 camUV = (uv * g2() + g3()); // 稍微縮小避免邊緣變形太誇張
        vec3 cam = texture2D(u_camera, camUV).rgb;
        col = mix(col, cam * (g3() + vol * g3()), g5 * u_useCamera);
    }
    
    // 最後一點整體調色 + 對比
    col = pow(col, vec3(g3(), g5, g2()));
    col *= g5 + vol * g2() + peak * g3();
    col = clamp(col, 0.0, g2());
    
    gl_FragColor = vec4(col, g2());
}
