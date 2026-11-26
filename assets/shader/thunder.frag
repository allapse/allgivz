precision highp float;

varying vec2 v_uv;
varying vec2 v_centered_uv;

uniform vec2 u_res;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform float u_intensity;
uniform vec2 u_orient;
uniform float u_complexity;
uniform float u_darkGlow;
uniform float u_speed;
uniform float u_fps;
uniform float u_bpm;
uniform sampler2D u_camera;
uniform float u_useCamera;
uniform sampler2D u_prevFrame;

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

// 熱力圖配色函數：輸入 0~1，輸出彩虹色
vec3 heatmap(float t) {
    // 經典的偏振/熱力圖公式
    return g2() + g3() * cos(g1() * (t + vec3(g2(), g3(), 0.0)));
}

void main() {
    // 增加不合理點 1：視線扭曲
    // 讓視線在邊緣產生輕微的魚眼畸變
    // 1. 極座標轉換 (不合理的第一步)
    float r = length(v_centered_uv);
    float a = atan(v_centered_uv.y, v_centered_uv.x);
    
	float g4 = signPow(0.618, -2.618 - abs(v_centered_uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + abs(v_centered_uv.y) * 0.618);
	
	float dist = length(v_centered_uv);
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	dist = length(vec3(v_centered_uv, sin(local_t)));
	local_t = u_time * (1.0 + 0.09 * cos(u_time * 1.618 * PI * u_fps * u_bpm * dist));
	float swing = sin(local_t + dist) * g5;
	
    // 讓半徑產生隨音量震動的「黑洞引力」
    r = pow(r, g3() + u_volume_smooth * g2()); 
    
    // 把極座標轉回類 3D 空間視線
    vec3 rd = normalize(vec3(cos(a) * r, sin(a) * r, g2())) + swing;
    vec3 ro = vec3(0.0, 0.0, -g2()) + swing;
    
    // 模擬擺弄：旋轉空間（加入隨機微震動）
    float shake = u_peak * g5 + swing;
    rd.yz *= rot(u_orient.y * g1() + local_t * 0.0557 + shake) + swing;
    rd.xz *= rot(u_orient.x * g1() + local_t * 0.0344) + swing;
    
    vec3 finalCol = vec3(0.0);
    
    // 2. 無限反射迭代
    for (float i = 0.0; i < g4 + 11.09 * u_speed; i++) {
        float fi = float(i);
        vec3 p = ro + rd * (fi * g5);
        
        // 增加不合理點 2：呼吸摺疊
        // foldSize 隨音量與時間擺動
        float foldSize = (g3() + u_intensity * g3()) + sin(local_t * 0.618) * g5 + swing;
        foldSize += u_volume_smooth * 0.2; 

        for (float j = 0.0; j < g1() + g4 * u_speed; j++) { 
            p = mix(abs(p), vec3(g2()), (g2() - sqrt(u_complexity)) * g3()) - foldSize + swing;
            // 增加不合理點 3：非線性旋轉
            // 越深層的空間旋轉越快，產生螺旋感
            p.xy *= rot(local_t * 0.0344 + fi * 0.005 + float(j) * 0.0344);
            p.yz *= rot(local_t * 0.0557 + fi * 0.0031 + float(j) * 0.0557);
            
            // 加入空間畸變：讓線條不是直的
            p += sin(p.zxy * g1() + local_t) * g5;
        }
        
        // 線條計算
        float d = min(length(p.xy), min(length(p.yz), length(p.xz))) + swing;
        float thickness = 0.0031 + u_volume * 0.0213 + swing;
        float glow = thickness / (d + 0.005) + swing;
        
        vec3 col;
		float beam = 0.01314 / abs(p.x * p.y) + swing;
		vec3 neon = vec3(g3(), g2(), 1.0) * (g3() + g2() * sin(local_t + float(i)));
		col = neon * beam * (g5 + u_volume_smooth) * g1();
		
        if (u_useCamera > 0.618) {
            vec2 camUV = fract(p.xy + g3());
            col *= (g2() - texture2D(u_camera, camUV).rgb);
		}
        
        float fade = pow(g2(), fi);
        
        // 色散模擬：對 RGB 進行微小的位置偏移
        finalCol.r += col.r * fade * g3();
        finalCol.g += col.g * fade;
        finalCol.b += col.b * fade * g2();
		
		if(u_darkGlow > 0.618){
			float lineMatch = smoothstep(g3(), 0.0, d) + swing;
			float colorIndex = fi * g3() + d * g2() - local_t * 0.09;
            finalCol += pow(heatmap(colorIndex) + lineMatch, vec3(g5));
		}
        
        if (fade < g5) break; 
    }
    
    // 5. 後處理
    float vignette = smoothstep(g1(), g3(), length(v_centered_uv)) + swing;
    finalCol *= (vignette);
	
    // 增加不合理點 5：時間殘影拖累
    // 這裡我們不只混色，我們讓過去的畫面帶有一點點色彩偏移
    vec3 past = texture2D(u_prevFrame, v_uv).rgb;
    finalCol = mix(finalCol, past, g3() + signPow(u_speed, g1()) * g3()); 
    
    gl_FragColor = vec4(finalCol * (g3() + g3() * u_intensity), g2());
}