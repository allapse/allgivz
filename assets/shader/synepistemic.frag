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
    dots[0] = base + vec2(-0.1, 0.3);
    dots[1] = base + vec2(-0.1, 0.0);
    dots[2] = base + vec2(-0.1,-0.3);
    dots[3] = base + vec2( 0.1, 0.3);
    dots[4] = base + vec2( 0.1, 0.0);
    dots[5] = base + vec2( 0.1,-0.3);

    float result = 0.0;
    for(int i=0; i<6; i++){
        if(((code >> i) & 1) == 1){
			float pulse = 0.5 + 0.5 * sin(u_time * 5.0 + float(i));
			float dynamicR = r * (1.0 + 0.5 * u_volume);
			vec2 jitter = vec2(sin(u_time * 3.0+float(i)), cos(u_time * 2.0+float(i))) * 0.02;
            result += float(((code >> i) & 1)) * smoothstep(dynamicR, dynamicR-0.01 *  u_volume, length(pos + jitter - dots[i])) * pulse ;
        }
    }
    return result;
}

void main() {
    vec2 uv = v_uv - 0.5;
    vec2 pos = uv * 17.0;
	float punch = pow(0.1 + u_intensity * u_complexity * u_speed * u_peak, 3.0);
	float freeze = 1.0 - (u_intensity + u_complexity + u_speed + u_peak) / 4.0;
	float bigZ = v_z * 77.0 * freeze;
	
	if(u_darkGlow > 0.5) {
		bigZ /= (1.0 + u_volume_smooth);
	}

    float wave = pow(0.5 + 0.5 * sin(u_time + pos.x * u_complexity) / (0.3 + 0.7 * bigZ), 3.0);
    wave *= u_volume_smooth;

    float sym = pow(sin(u_time + pos.x * u_complexity + bigZ) / (0.05 + 0.95 * cos(pos.y * u_intensity - bigZ)), 3.0);

    float motion = pow(0.3 + 0.7 * sin(u_time + length(pos) * u_speed), 3.0);

    vec3 baseColor   = vec3(0.1, 0.2, 0.3);
    vec3 accentColor = vec3(0.7, 0.5, 0.3);
    vec3 peakColor   = vec3(0.3, 0.5, 0.7);

    vec3 color = mix(baseColor, accentColor, wave);
    color = mix(color, peakColor, u_peak);
	
    color *= sym * motion * pow(0.3 + 0.7 * u_intensity, 3.0);
	
	float r = 0.07;
    for(int i=0; i<7; i++){
        vec2 base = vec2(-1.9 + float(i) * 0.7 + sin(freeze), 0.0);
        color += vec3(drawBraille(pos, base, r, brailleCodes[i])) * pow(0.5 + 0.3 * u_volume_smooth / (0.1 + punch), 3.0);
    }
	
	vec3 past = texture2D(u_prevFrame, v_uv).rgb;
	
	if(u_darkGlow > 0.5) {
		past += vec3(sin(u_intensity), cos(u_speed), sin(u_complexity));
		color = mix(color, past, 0.5 + 0.5 * punch);
	}
    
    gl_FragColor = vec4(color, 1.0);
}

