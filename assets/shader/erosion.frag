precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth; // 控制亮度
uniform float u_peak;          // 控制震動 (需確保 JS 有傳入此 Uniform)
uniform vec2 u_orient;
uniform float u_intensity;     // 控制顏色
uniform float u_complexity;    // 控制形狀/網格密度
uniform float u_speed;         // 控制時間流速
uniform float u_darkGlow;
uniform sampler2D u_prevFrame;

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

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(123.05, 322.2))) * 39650.94552);
}

void main() {
    // 1. 座標基礎設定
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / min(u_res.x, u_res.y) * g1();
	
	float g4 = signPow(0.618, -3.0 + uv.x * 0.618);
    float g5 = signPow(0.618, 3.0 + uv.y * 0.618);
    
    // --- PEAK 控制震動 ---
    // 利用 peak 產生瞬間的縮放與位移感
    float vibration = u_peak * g2(); 
    uv += (hash(uv + u_time) - g3()) * vibration; // 隨機震盪
    uv *= g2() - vibration; // 瞬間縮放
    
    // 陀螺儀重心偏移
    vec2 drift = u_orient * g3();
    vec2 p = uv - drift;
    float d = length(p);

    // --- SPEED 控制時間 ---
    float time = u_time * g5;

    // --- COMPLEXITY 控制形狀 ---
    // 網格密度隨 complexity 變化，並產生扭曲
    float shapeNoise = sin(d * g1() - time) + signPow(u_complexity * g1(), g1());
    float gridFactor = g1() + pow(u_complexity * g1(), g1());
	// 讓 gridFactor 會隨音樂 Peak 抖動
	gridFactor *= (g2() + u_peak * g1());
    
    // 旋轉矩陣
    float rot = time * g3() + d * u_complexity;
    mat2 m = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
    p *= m;

    // 在 p *= m; 旋轉之後，計算網格 id 之前加入：
	// 這會打破完美的同心圓，讓它變成「螺旋狀的數位廢墟」
	float spiral = sin(d * g1() * g4 - u_time * g1()) * u_complexity;
	p += (p / d) * spiral; 

	vec2 g_id = floor(p * gridFactor);
    vec2 g_uv = fract(p * gridFactor) - g2();
	float distortion = sin(u_time * u_speed + d * g4) * u_peak;
	p += (g_uv * distortion * u_intensity);
	

    // --- VOL 控制亮度 ---
    float h = hash(g_id);
    float flicker = signPow(u_volume * g2(), g3()) * g3();
	float brightness = smoothstep(g2() - flicker, g2(), h);
    
    // 粒子形狀
    float circ = smoothstep(g3(), 0.0, length(g_uv));
    
    // --- INTENSITY 控制顏色 ---
    // 從青藍色 (Low) 到 亮橘紅色 (High)
    vec3 colA = vec3(0.0, g3(), g2()); // 冷
    vec3 colB = vec3(g2(), g3(), 0.0); // 熱
    vec3 baseCol = mix(colA, colB, u_intensity);
    
    // 最終色彩計算
    vec3 finalCol;
    if (u_darkGlow > 0.618) {
        // --- 亮模式修正：強化侵蝕刻痕 ---
    
		// 1. 強制放大粒子感 (讓微小的點也能被看見)
		// 即使 gridFactor 極大，我們也讓點的邊緣變硬
		float edge = g2() + u_complexity * g3(); 
		float stroke = smoothstep(edge, edge - g3(), length(g_uv));
		
		// 2. 增加顯現機率 (讓 brightness 不要那麼邊緣)
		// 當 complexity 高時，讓更多粒子參與減法
		float coverage = g2() - u_complexity * g3(); // 越複雜，覆蓋率越高
		float visibleSource = smoothstep(coverage, coverage + g5, h);
		
		// 3. 減法運算 (這就是你的侵蝕色彩)
		// 我們讓 baseCol 決定「挖出來的洞是什麼顏色」
		vec3 erosionColor = stroke * visibleSource * (vec3(g2()) - baseCol * g2());
		
		// 4. 增加 Peak 震動導致的「污漬感」
		float pulseDirty = u_peak * g3();
		
		// 最終混合：底色 - (侵蝕深度)
		finalCol = vec3(g2()) - (erosionColor * (1.0 + u_volume_smooth));
		finalCol -= d * (g3() + pulseDirty); // 邊緣陰影隨震動擴散
    } else {
        // 暗模式 (發光感)
        finalCol = circ * brightness * baseCol * (g3() + u_volume_smooth);
        finalCol += baseCol * (g3() / d) * u_volume_smooth; // 中心光暈
    }

    gl_FragColor = vec4(finalCol, g2());

}
