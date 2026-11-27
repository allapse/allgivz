uniform vec2 u_resolution;

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
varying float v_z;

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

// 六個點位：上中下 × 左右
int brailleCodes[7] = int[7](
    62, // ⠾
    39, // ⠧
    39, // ⠧
    62, // ⠾
    31, // ⠟
    51, // ⠳
    58  // ⠺
);

float drawBraille(vec2 pos, vec2 base, float r, int code) {
    vec2 dots[6];
    dots[0] = base + vec2(-0.1, g3());
    dots[1] = base + vec2(-0.1, 0.0);
    dots[2] = base + vec2(-0.1,-g3());
    dots[3] = base + vec2( 0.1, g3());
    dots[4] = base + vec2( 0.1, 0.0);
    dots[5] = base + vec2( 0.1,-g3());

    float result = 0.0;
    for(int i=0; i<6; i++){
        if(((code >> i) & 1) == 1){
			float pulse = g3() + g2() * sin(u_time * 4.237 + float(i));
			float dynamicR = r * (g2() + g3() * u_volume);
			vec2 jitter = vec2(sin(u_time * 2.618 + float(i)), cos(u_time * 1.618 + float(i))) * 0.02;
            result += float(((code >> i) & 1)) * smoothstep(dynamicR, dynamicR - 0.01 *  u_volume, length(pos + jitter - dots[i])) * pulse ;
        }
    }
    return result;
}

void main() {
    vec2 uv = v_uv - 0.5;
    vec2 pos = uv * 17.95;
	
	float dist = length(uv);
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g3() * dist;
	}
	else {
		local_t -= g2() * dist;
	}
	
	float g4 = signPow(0.618, -2.618 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + dist * 0.618);
	
	float punch = signPow(g5 + u_intensity * u_complexity * u_speed * u_peak, 2.618);
	float freeze = 1.0 - (u_intensity + u_complexity + u_speed + u_peak) / 4.237;
	float bigZ = v_z * 77.0 * freeze;
	
	if(u_darkGlow > 0.618) {
		bigZ /= (g1() + u_volume_smooth);
	}

    float wave = signPow(g3() + 0.618 * sin(local_t + pos.x * u_complexity) / (0.382 + 0.618 * bigZ), 2.618);
    wave *= u_volume_smooth;

    float sym = signPow(sin(local_t + pos.x * u_complexity + bigZ) * (0.0557 + 1.0 * cos(pos.y * u_intensity - bigZ)), 2.618);

    float motion = signPow(g3() + 0.618 * sin(local_t + length(pos) * u_speed), 2.618);

    vec3 baseColor   = vec3(0.146, 0.236, 0.382);
    vec3 accentColor = vec3(g2(), g5, 0.382);
    vec3 peakColor   = vec3(g3(), g2(), g5);

    vec3 color = mix(baseColor, accentColor, wave);
    color = mix(color, peakColor, u_peak);
	
    color *= sym * motion * signPow(g3() + g2() * u_intensity, 2.618);
	
	float r = 0.07;
    for(int i=0; i<7; i++){
        vec2 base = vec2(-1.9 + float(i) * 0.7 + sin(freeze), 0.0);
        color += vec3(drawBraille(pos, base, r, brailleCodes[i])) * pow(0.5 + 0.3 * u_volume_smooth / (0.1 + punch), 3.0);
    }
	
	vec3 past = texture2D(u_prevFrame, v_uv).rgb;
	
	if(u_darkGlow > 0.618) {
		past += vec3(sin(u_intensity), cos(u_speed), sin(u_complexity)) * g3();
		color = mix(color, past, g5 + g3() * punch);
	}
    
    gl_FragColor = vec4(color, 1.0);
}

