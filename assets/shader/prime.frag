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
    float dist = sin(length(p - center)) / cos(dot(p, center));
    // 波動：cosine + 衰減
    return cos(dist * 20.0 - time);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
	vec3 p = sphereCoord(uv);
	
	// 模擬擺弄：旋轉空間（加入隨機微震動）
    float shake = u_peak * 0.1;
    p.yz *= rot(u_orient.y * 1.3 + u_time * 0.05 + shake);
    p.xz *= rot(u_orient.x * 1.5 + u_time * 0.03);

    // mesh 上的質數節點 (簡單取幾個質數)
    vec3 primes[7];
    primes[0] = vec3(0.1 + u_volume, 0.1 - u_time, 0.1 + u_volume_smooth);
	primes[1] = vec3(0.1 - u_peak, 0.1 + u_volume, 0.1 - u_time);
	primes[2] = vec3(0.1 + u_intensity, 0.1 - u_peak, 0.1 + u_volume);
	primes[3] = vec3(0.1 - u_complexity, 0.1 + u_intensity, 0.1 - u_peak);
	primes[4] = vec3(0.1 + u_speed, 0.1 - u_complexity, 0.1 + u_intensity);
	primes[5] = vec3(0.1 - u_volume_smooth, 0.1 + u_speed, 0.1 - u_complexity);
	primes[6] = vec3(0.1 + u_time, 0.1 - u_volume_smooth, 0.1 + u_speed);

    float waveSum = 0.0;
    for (int i = 0; i < 3; i++) {
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
    color = mix(color, past, 0.3 + pow(u_speed, 3.0) * 0.3); 

    gl_FragColor = vec4(color, 1.0);
}
