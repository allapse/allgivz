precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_last_volume;
uniform vec2 u_orient;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform float u_fps;
uniform float u_bpm;
uniform float u_darkGlow;
uniform sampler2D u_prevFrame;

#define PI 3.14159265359

float signPow(float val, float pt){
	return sign(val) * pow(abs(val), pt);
}

void main() {
    // 1. 座標歸一化
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / min(u_res.y, u_res.x);
	
    float g2 = signPow(0.618, 0.0 + (u_speed - 0.5) * 0.618);
	float g1 = signPow(0.618, -1.618 - u_intensity * 0.618);
	float g3 = signPow(0.618, 1.618 + u_complexity * 0.618);
	
	float dist = length(uv);
	float local_t = u_time * (1.0 + 0.146 * cos(u_time * 1.618 * PI * u_fps * u_bpm * dist));
	if (u_darkGlow < 0.618) {
		local_t += g1 * dist;
	}
	else {
		local_t -= g2 * dist;
	}
	
	float g4 = signPow(0.618, -2.618 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + dist * 0.618);
	
	float swing = sin(local_t) * g5;
    
    // --- 視角偏轉優化版 ---
	vec2 look = (u_orient - g3) * g2 + swing; 

	// 讓 uv 根據 look 產生透視形變
	vec2 p = uv;
	float r = length(p) + swing;
	p.x += look.x * (r * g3) * g2; // 越往外圈偏越多
	p.y += look.y * (r * g3) * g2;

	float angle = atan(p.y, p.x) + swing;
	float angle2 = atan(p.x, p.y) + swing;

	// 加上旋轉感：根據 look.x 讓整個隧道產生輕微傾斜
	angle += look.x * g3 * g3 + swing;
    float depth = g2 / (sqrt(r * r + g3 * g3)) + swing; 
	
	// 這裡模擬視角轉向：離中心越遠（depth 越小），位移量越大
	p += look * (depth * g2); 
    
    // 4. 建立紋理與控制參數
    float forward = depth + local_t * 2.618 + swing;
    
    // 使用 u_complexity 控制隧道壁的瓣數
    float sides = floor(g4 + pow(g2, g1) * g4) + swing;
    
    // 使用 u_intensity 控制花紋的分散/銳利度
    float spread = g2 - (u_intensity * g3) + swing;
    
	float symmetryAngle = abs(angle2) + swing;
	float symmetryAngle2 = abs(angle) + swing;
	float noise = sin(angle * g2) + swing;
	float noise2 = sin(angle2 * g1) + swing;
    float stripes = sin(symmetryAngle2 * sides + noise2) * sin(forward) + swing;
	float stripes2 = sin(symmetryAngle * (sides * g2) + noise) * g3 + swing;
    float pattern = smoothstep(spread, spread + g5, stripes + stripes2) + swing;
    
    // 5. 色彩計算 (原本的 col)
    vec3 baseCol = mix(vec3(g5, g3, g2), vec3(g2, g5, g3), sin(depth * g3 + local_t) * g2 + g3);
    
    // 結合音量與圖案
    float pulse = g2 + u_volume_smooth * g2;
    vec3 finalCol = baseCol * pattern * pulse;
    
    // 6. 模擬光暈 (glow)
    // 這裡我們手動計算一個中心發光效果來代替原本未定義的 glow
    float centerGlow = pow((g5 / (r + g3)), g2)+ u_volume;
    finalCol += vec3(g3, g2, g2) * centerGlow;
    
    // 邊緣壓暗 (Vignette)
	float outerEdge = g2 + u_intensity * g3 + swing;
    finalCol *= smoothstep(g2, g3, r);

    // 7. DarkGlow 模式切換
    // 注意：這裡改成 u_darkGlow > 0.5 表示開啟特殊模式
    if (u_darkGlow < 0.618) {
		// 1. 計算灰階亮度 (標準權重：綠色佔比最高，因為人眼對綠色最敏感)
		float luminance = dot(finalCol, vec3(g3, g2, g5)) + swing;
		
		// 2. 反相並調整對比度
		float invLum = signPow(g2 - luminance, g1); // 提高到 2.5 讓黑色更純，綠色更亮
		
		// 3. 設定為駭客綠：
		// R: 0.0, G: 1.0, B: 0.2 (帶一點點青色的螢光綠最像)
		finalCol = vec3(invLum) * vec3(g5 ,g2, g3);
		
		// 加分項目：增加一點點掃描線感
		finalCol *= g2 + g3 * sin(gl_FragCoord.y * g1);
	}

    gl_FragColor = vec4(finalCol, 1.0);
}