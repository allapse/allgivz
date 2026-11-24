precision highp float;

uniform vec2 u_res;
uniform vec2 u_orient;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform float u_darkGlow;
uniform sampler2D u_camera;
uniform float u_useCamera;
uniform sampler2D u_prevFrame;

varying vec2 v_uv;
varying vec2 v_centered_uv;
varying float v_z;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

vec3 sphereCoord(vec2 uv) { 
	float theta = uv.x * 3.14159; // 0 ~ π 
	float phi = uv.y * 3.14159; // 0 ~ π 
	return vec3( sin(phi) * cos(theta), sin(phi) * sin(theta), cos(phi) ); 
}

// 簡單的「質數波動」函數：用 mesh 節點模擬質數位置
float primeWave(vec3 p, vec3 center, float time) {
    float dist = sin(length(p - center)) / (0.5 + 0.5 * cos(dot(p, center)));
    // 波動：cosine + 衰減
    return cos(dist * 20.0 - time);
}

float params[7];

float pickTwoAndMultiply(int seed) {
    // 用 seed 來決定索引
    int len = 5;

    // 第一個索引：seed 的餘數
    int idxA = seed % len;

    // 第二個索引：用 fract 折疊再映射
	int idxB = (seed + 1)  % len;

    // 返回相乘結果
    return params[idxA] * params[idxB];
}

void main() {
    vec2 uv = v_uv;
	vec3 p = sphereCoord(uv);
	
	// 模擬擺弄：旋轉空間（加入隨機微震動）
    float shake = u_peak * 0.1;
    p.yz *= rot(u_orient.y * 1.3 + u_time * 0.05 + shake);
    p.xz *= rot(u_orient.x * 1.5 + u_time * 0.03);
	p.z += v_z;
	
	params[0] = u_volume;
	params[1] = u_volume_smooth;
	params[3] = u_peak;
	params[4] = u_intensity;
	params[5] = u_complexity;
	params[6] = u_speed;

    // mesh 上的質數節點 (簡單取幾個質數)
    vec3 primes[7];

    float waveSum = 0.0;
    for (int i = 0; i < 7; i++) {
		if (i % 2 == 0) { 
			params[2] = sin(u_time); 
		} else { 
			params[2] = cos(u_time);
		}
		float fi = 0.2 + sqrt(sqrt(float(i) * 0.2));
		primes[i] = vec3(0.1 + pickTwoAndMultiply(i) * fi, 0.1 - pickTwoAndMultiply(i+1) * (fi + 0.1), 0.1 + pickTwoAndMultiply(i+2) * (fi + 0.2));
        waveSum += primeWave(p, primes[i], u_time);
    }

    // 視覺化：亮區代表「覆蓋」，暗區代表「未覆蓋」
    vec3 color = vec3(0.5 + 0.5 * sin(waveSum), 0.5 + 0.5 * cos(waveSum), 0.5 + 0.5 * sin(waveSum * 0.5));
    if (u_darkGlow > 0.5) {
        color = vec3(waveSum * 0.5, waveSum * 0.3, waveSum);
    } else {
        color = vec3(abs(waveSum));
    }

    // 如果使用 camera，混合輸入影像
    if (u_useCamera > 0.5) {
        vec3 cam = texture2D(u_camera, uv).rgb;
        color = mix(color, cam, 0.5);
    }
	
	vec3 past = texture2D(u_prevFrame, uv).rgb;
    color = mix(color, past, 0.7 + pow(u_speed, 3.0) * 0.3); 

    gl_FragColor = vec4(color, 1.0);
}
