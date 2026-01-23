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

float hash11(float p) {
    return fract(sin(p * 727.1) * 43758.5453123);
}

mat3 rotateX(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(1.0, 0.0, 0.0, 0.0, c, s,  0.0, -s, c); 
}

mat3 rotateY(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); 
}

void main() {
    // 基礎座標校正
    vec2 uv = gl_FragCoord.xy / u_res.xy;
    vec3 p = vec3(uv - 0.5, 0.5);
    p.x *= u_res.x / u_res.y; // 修正比例
	mat3 rot = rotateY(u_orient.x + u_time*0.1) * rotateX(u_orient.y + u_time*0.2);
	p *= rot;
	
    // 設定模擬的 Z 軸深度 (givz)
    // 這裡我們把 givz 當作一個動態的深度基礎
    float givz = 5.0 - (0.1 + pow(u_complexity * 0.9, 3.0)) * 5.0;
    
    float t = u_time * 0.3;
    float vol = u_volume;
    float peak = u_peak;
    float intensity = u_intensity * (0.5 + vol * 0.5 + peak * 0.5);
	
	// 2. lift to 4D
	vec4 v = vec4(p, givz);
	
	float a = t * 0.5 + vol;
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
	p *= v.xyz / (-0.5 + abs(v.z));

	float w = t * 0.5 + vol;
	float field = sin(p.x * 4.0 + p.y * 3.0 + givz * 2.0 + w);
	p += normalize(p) * field * 0.15 / (1.0 + abs(sin(t + vol)));

    
    // ─── 扭曲底層座標 ────────────────────────────────────────
    float angle = atan(p.x/givz, p.y/givz);
    float dist = length(p)/givz;
    
    // 低頻驅動的放射狀波紋 + 旋轉
    float wave = sin(dist * 12.0 - t * 0.5 + vol * 8.0) * 0.5 + 0.5;
    float swirl = sin(angle * 5.0 + t + vol * 4.0) * 0.12 * u_complexity;
    
    p += vec3(cos(angle + t * 0.7), sin(angle - t * 0.9), cos(angle + t * 0.5)) * dist * 0.25 * vol;
    p *= 1.0 + vol * 0.15 + peak * 0.4;
    p *= vec3(cos(swirl), sin(swirl), sin(wave)) * dist + p * (0.92 + peak * 0.15);
    
    // ─── 多層圓形/環狀結構 ───────────────────────────────────
    vec3 col = vec3(0.0);
    float accum = 0.0;
    
    for(float i = 1.0; i <= 100.0; i++) {
        float fi = pow(i/ 37.0, 1.5) ;
        float radius = 0.15 + fi + vol * 0.18;
        
        float d = length(p * (1.0 + fi * 0.4 * u_complexity));
        float ring = smoothstep(0.015, 0.0, abs(d - radius));
        
        float pulse = sin(t * (0.8 + fi * 1.2) + fi * TAU * 0.7) * 0.5 + 0.5;
        pulse = mix(pulse, 1.0, peak * 0.7);
        
        vec3 hue = 0.6 + 0.4 * cos(TAU * vec3(0.0, 0.33, 0.67) + fi * 4.0 + t * 0.3);
        hue *= (1.0 + vol * 1.2);
        
        float glow = ring * (0.4 + pulse * 0.6) * (1.2 - fi * 0.4);
        glow *= (1.0 + peak * 3.0 * (1.0 - fi));
        
        col += hue * glow * intensity * (0.7 + vol * 0.6);
        accum += glow;
    }
    
    // ─── 中心亮點 + 暗部輝光補償 ─────────────────────────────
    float core = smoothstep(0.18, 0.02, length(p));
    core *= (1.0 + vol * 2.5 + peak * 4.0);
    col += vec3(1.2, 0.95, 0.8) * core * intensity * 1.4 * u_darkGlow;
    
    // 整體暗部輝光（u_darkGlow 控制）
    col += vec3(0.4, 0.2, 0.9) * accum * u_darkGlow * 1.5;
    
    // ─── 選用 camera 作為底圖（可調透明度）────────────────────
    if(u_useCamera > 0.5) {
        vec2 camUV = (uv * 0.8 + 0.5); // 稍微縮小避免邊緣變形太誇張
        vec3 cam = texture2D(u_camera, camUV).rgb;
        col = mix(col, cam * (0.4 + vol * 0.3), 0.25 * u_useCamera);
    }
    
    // 最後一點整體調色 + 對比
    col = pow(col, vec3(0.95, 0.92, 1.05));
    col *= 0.8 + vol * 0.5 + peak * 0.6;
    col = clamp(col, 0.0, 1.2);
    
    gl_FragColor = vec4(col, 1.0);
}