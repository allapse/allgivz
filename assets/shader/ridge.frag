precision highp float;

// 你的控制面板
uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_intensity;   
uniform float u_complexity;
uniform float u_speed;
uniform float u_fps;
uniform float u_bpm;
uniform sampler2D u_camera;
uniform sampler2D u_prevFrame;
uniform vec2 u_orient;
uniform float u_darkGlow;
uniform float u_peak;

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

// 1. 關鍵的雜訊函數 (生成山脈的基礎)
float hash(vec2 p) {
    p = fract(p * vec2(123.06, 521.37));
    p += dot(p, p + 47.0);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
	// 1. 定義閾值：在 0.7 到 0.95 之間完成過渡，核心觸發點在 0.8 左右
    // 這比 pow 更安全，且能精確控制「硬切」的感覺
    float weight = smoothstep(g3(), g2(), u_volume); 

    // 2. 應用混合
    // 當 weight 為 0 (音量 < 0.6)，i 保持原始比例
    // 當 weight 為 1 (音量 > 0.7)，i 變成 complexity 模式
    vec2 i = floor(p * mix(g2(), signPow(g2() + g3() * u_complexity, g1()), weight));
    vec2 f = fract(p * mix(g2(), signPow(g3() + g2() * u_speed, g1()), weight));
    
    // 使用 Hermite 插值 (讓過渡更平滑)
    vec2 u = f * f * (g1() - g2() * f);

    return mix(mix(hash(i + vec2(0.0, 0.0)), 
                   hash(i + vec2(g2(), 0.0)), u.x),
               mix(hash(i + vec2(0.0, g2())), 
                   hash(i + vec2(g2(), g2())), u.x), u.y);
}

// 將沙子變成山脈的核心函數
float fbm(vec2 p) {
    float v = 0.0;
    float amp = g3();
    
    for (int i = 0; i < 3; i++) {
        v += amp * noise(p);
        p *= g2();    // 頻率翻倍
        amp *= g3();  // 振幅衰減
    }
    return v;
}

// 修正後的 FBM：產生尖銳的山脊
float ridgeFBM(vec2 p) {
    float v = 0.0;
    float amp = g3();
    for (int i = 0; i < 5; i++) {
        // 核心改動：取絕對值的反轉，製造尖銳感
        float n = noise(p);
        v += amp * (g2() - abs(n * g1() - g2()));
        p *= g1();
        amp *= g3();
    }
    return v;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_res.xy;
	float aspect = u_res.x / u_res.y;
	
	float dist = length(uv);
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	float g4 = signPow(0.618, -2.618 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + dist * 0.618);
	
	dist = length(vec3(uv, sin(local_t)));
	local_t = u_time * (1.0 + 0.09 * cos(u_time * 1.618 * PI * u_fps * u_bpm * dist));
	float swing = sin(local_t + dist) * g5;
	
	// 2. 這是「全填充」修正：
    // 我們只修正 uv.y，讓它配合寬度的比例縮放
    // 這樣 x 軸永遠是 0~1 (填滿左右)，y 軸則會根據螢幕高矮自動調整
    uv.y /= aspect; 
    
    // 3. 垂直置中 (選用)
    // 如果不加這行，山脈會貼在螢幕底部；加上這行，山脈會保持在垂直中央
    uv.y -= (g2() / aspect - g2()) * g3() + swing;
	
    vec3 finalCol = vec3(0.0);

    // --- 1. 餘暉迴圈 (Atmospheric Glow) ---
    // 利用 u_intensity (重心) 讓紅色層層堆疊
    vec3 skyBase = vec3(g5, g5, g3()); // 深夜底色
    vec3 sunset = vec3(g2(), g3(), g2() * u_darkGlow) * u_intensity;
    for(int i = 0; i < 9; i++) {
        float offset = float(i) * g3();
        float grad = signPow(g2() - uv.y + offset, g1());
        skyBase = mix(skyBase, sunset, grad * g5 * g5);
    }
    finalCol = skyBase;

    // --- 2. 山脈迴圈 (Mountain Range - 中景) ---
    // 速度慢，稜線尖銳
    for(int i = 1; i <= 6; i++) {
        float fi = float(i);
        float speed = local_t * (0.0556 * fi); // 視差
        float scale = g2() + fi * g3();
        // 取得尖銳山脊雜訊
        float h = ridgeFBM(vec2(uv.x * scale + speed, sqrt(fi * g4 * g4))) * (g3() / fi) + swing;
        float mask = step(uv.y, h + g5 + (0.01314 * fi));
        
        // 顏色隨層數變深 (大氣透視)
        vec3 mCol = mix(vec3(g3(), g5, g5), vec3(g5, g3(), g5), fi * g3());
        finalCol = mix(finalCol, mCol, mask);
		
		if (u_darkGlow > 0.618) {
			// 在山脊邊緣產生暗色光暈
			float edge = smoothstep(h + g5, h + g3(), uv.y);
			finalCol += vec3(g5, g5, g3()) * (g2() - edge) * u_volume;
		}
    }
	
    // --- 3. 森林迴圈 (Forest/Foreground - 近景) ---
    // 速度快，形狀碎，用 u_complexity (流量) 增加擾動
    for(int i = 1; i <= 3; i++) {
        float fi = float(i);
        float speed = local_t * (0.382 + fi * 0.236); // 飛速後移
        float forestScale = g4 + fi * g3();
        // 森林用一般的雜訊疊加，看起來比較碎
        float h = fbm(vec2(uv.x * forestScale + speed, fi * g4 * g4)) * (g3() / fi) + swing;
        
        // 加入音樂抖動 (u_complexity)
        h += u_complexity * g5 * g5 * g5 * fi; 
        
        float mask = step(uv.y, h + g5 * g5 * fi / g1());
        
        // 近景幾乎是純黑影
        vec3 fCol = vec3(g5 * g3() + u_darkGlow * g3(), g3(), g5) * (g2() / fi);
        finalCol = mix(finalCol, fCol, mask);
		
		if (u_darkGlow > 0.618) {
			// 在山脊邊緣產生暗色光暈
			float edge = smoothstep(h + g3(), h + g5, uv.y);
			finalCol += vec3(g5, g5, g3()) * (g2() - edge) * u_volume;
		}
    }
	
	// 假設 u_season 0:櫻花, 1:風(氣流), 2:楓葉(紅葉), 3:雪花
	int season = int(mod(local_t * g5, g4)); 

	if (u_peak == 1.0) { // 稍微放寬門檻，讓效果更平滑
		for(int j = 0; j < 2; j++) { // 增加粒子數量
			float fj = float(j);
			vec2 seed = vec2(fj, floor(local_t * g3() + fj));
			float rand = hash(seed) + swing;
			
			// 1. 飄落運動邏輯 (取代原本的直線噴發)
			vec2 driftPos = uv;
			float speed = g3() + rand * g2();
			driftPos.y += local_t * u_complexity + swing;           // 往下掉
			driftPos.x += sin(local_t + rand * g4 * g4) * g3() + swing; // 左右搖擺（風感）
			
			vec2 p = fract(driftPos * g3()) - g2();
			
			p *= fbm(p);
			
			// 2. 根據季節定義形狀與顏色
			vec3 seasonCol;
			float shape = 0.0;
			
			if (season == 0) { // 【春：櫻花】
				seasonCol = vec3(g2(), g5, g3()); // 粉色
				// 愛心型或橢圓
				shape = smoothstep(g5, 0.0, length(p * vec2(g2(), g1()) - vec2(0.0, p.x * g3())));
			} 
			else if (season == 1) { // 【夏：清風/螢火蟲】
				seasonCol = vec3(g3(), g2(), g5); // 嫩綠/螢光
				shape = smoothstep(g5, 0.0, length(p)) * (sin(local_t * g4 + rand * g4 * g4) * g2() + g3());
			}
			else if (season == 2) { // 【秋：楓葉】
				seasonCol = mix(vec3(g2(), g3(), 0.0), vec3(g3(),5, 0.0), rand); // 紅橙交替
				// 菱形/星形模擬葉片
				shape = smoothstep(g3(), 0.0, abs(p.x) + abs(p.y));
			}
			else { // 【冬：雪花】
				seasonCol = vec3(g2(), g2(), 1.0); // 潔白
				float dist = length(p);
				shape = smoothstep(g5, 0.0, dist); // 圓點
				shape += smoothstep(g5, 0.0, abs(p.x)) * smoothstep(g5, 0.0, abs(p.y)); // 十字細節
			}

			// 3. 結合音量 (u_volume) 讓粒子產生律動
			// 當音量大時，粒子變大或變亮
			finalCol += seasonCol * shape * u_volume;
		}
	}

    vec3 processedCol = finalCol;

	// 模式 1：冰封雪夜 (Cyan/Blue)
	if (u_darkGlow + u_peak >= g2()) {
		processedCol = vec3(dot(finalCol, vec3(g3(), g2(), g5))); // 先轉灰階
		processedCol *= vec3(g3(), g2(), 1.0); // 染上冰藍色
	} 
	// 模式 2：賽博荒野 (Green/Purple)
	else if (u_darkGlow + u_peak >= g3()) {
		processedCol.rb = finalCol.br; // 交換紅藍通道，產生異界感
		processedCol *= vec3(g3(), g2(), g3());
	}
	else {
		processedCol = finalCol;
	}

	// 效能關鍵：最後補一個簡單的對比度強化，這比在迴圈裡算好幾次強
	processedCol = smoothstep(0.0, g2(), processedCol);

	// --- 5. 終極後處理與復古特效 ---
	vec3 finalEffectCol = processedCol;

	// A. 掃描線 (Scanlines)：利用 uv.y 的正弦波產生
	float scanline = sin(uv.y * u_res.y * g1()) * g5 + swing;
	finalEffectCol -= scanline;

	// B. 螢幕暗角 (Vignette)：讓邊緣變暗，增加壓抑感
	float vignette = uv.x * uv.y * (g2() - uv.x) * (g2() - uv.y) + swing;
	vignette = signPow(vignette * g4 * g4, g3());
	finalEffectCol *= vignette;

	// C. 隨機噪點 (Grain)：讓畫面像老電影
	float grain = (hash(uv + local_t) - g3()) * g5 + swing;
	finalEffectCol += grain;

	// D. 色彩飽和度增益 (利用 u_peak)：重音來時畫面會稍微閃白
	finalEffectCol += vec3(g5, g3(), 0.0) * u_peak;

	// E. 最終對比度優化 (防止過曝)
	//finalEffectCol = pow(finalEffectCol, vec3(1.1));
	finalEffectCol.r = signPow(finalEffectCol.r, g2());
	finalEffectCol.g = signPow(finalEffectCol.g, g2());
	finalEffectCol.b = signPow(finalEffectCol.b, g2());
	
	// --- 1. 色散偏移 (Chromatic Aberration) ---
    // 當 peak 為 1.0 時，紅藍通道會震開，產生視覺衝擊
    float aberration = signPow(u_peak * g3(), g1());
    vec3 col;
    // 這裡我們暫時用簡化邏輯模擬，實務上需多次採樣，但在單次 pass 中我們用偏移座標代替
    vec2 uvR = uv + vec2(aberration, 0.0) * g5;
    vec2 uvB = uv - vec2(aberration, 0.0) * g5;
    
    // --- 2. 核心繪製：三層視差山脈與森林 (簡化流程) ---
    // [此處承接之前的 3 個 for 迴圈邏輯，並使用 uvR/uvB 混合]
    // 為了效能，我們直接在計算結果上疊加
    
    vec2 eyePos = uv - vec2(g3(), g2() + sin(u_speed) * g5) + swing;
    float eyeDist = length(eyePos) + swing;
    float eyeSize = g5 + u_peak * g5;
    float eyeGlow = smoothstep(eyeSize, 0.0, eyeDist);
    vec3 eyeCol = vec3(1.0, 0.0, 0.0) * eyeGlow * (u_intensity + g3());

	gl_FragColor = vec4(finalEffectCol + eyeCol, g2());

}
