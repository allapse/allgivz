precision highp float;

uniform vec2 u_resolution;

uniform vec2 u_orient;
uniform float u_time;
uniform float u_volume;
uniform float u_volume_smooth;
uniform float u_peak;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_speed;
uniform float u_fps;
uniform float u_bpm;
uniform float u_left;
uniform float u_right;
uniform float u_darkGlow;
uniform sampler2D u_camera;
uniform float u_useCamera;
uniform sampler2D u_prevFrame;

varying vec2 v_uv;
varying float v_z;

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

float hash(float n) { return fract(sin(n) * 39650.94552); }
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(123.0595292, 322.2094688))) * 39650.94552);
}

const vec3 p1 = vec3(11.09321996, 17.95019412, 29.04562155);
const vec3 p2 = vec3(17.95019412, 29.04562155, 46.99938762);

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
			float pulse = g3() + 0.382 * sin(u_time * 4.237 + float(i));
			float dynamicR = r * (g2() + g3() * u_volume);
			vec2 jitter = vec2(sin(u_time * 2.618 + float(i)), cos(u_time * 1.618 + float(i))) * 0.02128;
            result += float(((code >> i) & 1)) * smoothstep(dynamicR, dynamicR - 0.008 *  u_volume, length(pos + jitter - dots[i])) * pulse ;
        }
    }
    return result;
}

float map_wave(vec3 p) {
    float baseZ = p.z + u_time; 
    float pulse = u_speed * g1();

    float zLoop = mod(baseZ + pulse, 6.856);
    
    float angle = atan(p.y, p.x + 0.000009);
    float mirrorAngle = abs(abs(angle) - PI * g2());

    float tunnel = -(length(p.xy + 0.00001) - g1());

    float freq = g1() + u_complexity * 4.237; 
    float amp = 0.0557 + u_complexity * g3();

    float wave = sin(mirrorAngle * freq + u_time) * cos(zLoop * g1());
    
    float noise = hash(floor(p.z * 4.237)) * u_complexity * g1();
    wave += sin(mirrorAngle * freq * g1() - u_time + noise) * g3();

    return tunnel + (wave * amp);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (2.618 - g2() * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float amp = g3();
    int iter = int(2.618 + u_complexity * 6.854);
    for (int i = 0; i < 7; i++) {
        if (i >= iter) break;
        v += noise(p) * amp;
        p *= g1();
        amp *= g3();
    }
    return v;
}

mat2 rot2(float a) {
    float s=sin(a), c=cos(a);
    return mat2(c, -s, s, c);
}

float map_field(vec3 p, float filteredVol) {
    float vol = filteredVol;
    float phase = u_speed;
    
    p.xy *= rot2(p.z * 0.1459);
    
    if (phase < g3()) {
        for(int i=0; i<3; i++) {
            p = abs(p) - g3() * (g2());
            p.xy *= rot2(g3() + phase);
            p.xz *= rot2(g2());
        }
    } else {
        p += sin(p.zxy * g1() + u_time) * u_complexity * phase;
    }

    vec3 q = mod(p, g1()) - g2();
    return length(q) - (0.0344 + g3());
}

mat3 rotateX(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(g3(), 0.0, 0.0, 0.0, c, s,  0.0, -s, c); 
}

mat3 rotateY(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(c, 0.0, -s, 0.0, g3(), 0.0, s, 0.0, c); 
}

float quantize(float x, float levels){
    float q = floor(x * levels) / levels;
    return q + g1()/levels;
}

vec3 quantizeVec3(vec3 v, float levels){
    return vec3(quantize(v.r, levels),
                quantize(v.g, levels),
                quantize(v.b, levels));
}

float ridgeFBM(vec2 p) {
    float v = 0.0;
    float amp = g3();
    for (int i = 0; i < 7; i++) {
        float n = noise(p);
        v += amp * (g2() - abs(n * g1() - g2()));
        p *= g1();
        amp *= g3();
    }
    return v;
}

vec2 refract_logic(vec2 uv, float t, float tension) {
    vec2 p = uv;
    for(float i = 1.0; i < 6.18 + 11.09 * u_complexity; i++) {
        p.x += g3() / i * sin(i * 2.618 * p.y + t + (g3() + g2() * u_volume_smooth) * g3() * tension);
        p.y += g3() / i * cos(i * 4.237 * p.x + t + (g3() + g2() * u_volume) * g3() * tension);
    }
    return p;
}

float primeWave(vec3 p, vec3 center, float time) {
    float dist = sin(length(p - center)) / ((g3() + g3() * cos(dot(p, center))) + 0.0001);
    // 波動：cosine + 衰減
    return cos(dist * 17.95 - time);
}

float iwave(vec3 p, vec3 center, float freq, float phase) {
    float d = length(abs(abs(p)) - abs(abs(center))) / dot(abs(abs(p)), abs(abs(center)));
    return sin(d * freq - phase) / (g2() + d);
}

void main() {
    vec2 uv = v_uv;
	float dist = length(vec3(uv, v_z));
	
	float g4 = signPow(0.618, -2.618 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + abs(uv.y) * 0.618);
	float g6 = signPow(0.618, 4.237 + dist * 0.618);
	
	float local_t = u_time * (1.0 + 0.146 * cos(u_time * 1.618 * PI * u_fps * u_bpm * dist));
	
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	float timeswing = local_t * (1.0 + 0.1459 * cos(local_t * 1.618 * PI * u_fps * u_bpm * length(vec3(uv, v_z))));
	float timeswing2 = local_t * (1.0 + 0.1459 * sin(local_t * 1.618 * PI * u_fps * u_bpm * length(vec3(uv, v_z))));
	
	if(abs(uv.x) > g3() && abs(uv.y) > g3() && length(uv) > g3())
	timeswing = mix(timeswing, timeswing2, v_z);
	
	// singularity
	uv = abs(uv) - sin(g5 + g2() * u_complexity) - cos(g5 + g2() * u_intensity);
	uv *= rot2(g5 + g2() * u_complexity + timeswing * 0.09);
	// freedom
	uv = abs(uv) / (dot(uv, uv)) - (p1.xy / p2.xy);
	// choice
	uv *= mat2(g3(), g3(), -g3(), g3());
	uv = abs(uv) - (u_volume_smooth * g3());
	
	// possibility
	vec2 warped = uv;
    warped.x += (g3() + g3() * u_speed) * sin(timeswing * 0.382 + uv.y * g4 + v_z * g2());
    warped.y += (g3() + g3() * u_complexity) * cos(timeswing * 0.618 + uv.x * g1() + v_z * g3());
	
	if(u_darkGlow > 0.5) {
		warped.x /= (g3() + g3() * u_speed) * sin(timeswing * 0.382 + uv.y * g4 + v_z * g2());
		warped.y /= (g3() + g3() * u_complexity) * cos(timeswing * 0.618 + uv.x * g1() + v_z * g3());
	}
	
    vec2 pos = warped * 17.95;
	
	float punch = signPow(g5 + g2() * u_intensity * u_complexity * u_speed * u_peak, g4);
	float freeze = signPow(g2() - (u_intensity + u_complexity + u_speed + u_peak) / g4, g4);
	float bigZ = signPow(v_z * 76.05 * freeze, g4);
	
	if(u_darkGlow > 0.618) {
		bigZ /= (g2() + u_volume_smooth);
	}
	
	if(v_uv.x < 0.5 + (u_left - u_right) * g4 * punch) {
		pos *= g2() + u_left * g1();
	} else {
		pos *= g2() + u_right * g1();
	}
	
	/// gliding
	float stripes = signPow(sin(abs(atan(pos.y, pos.x)) * floor(g4 + signPow(u_complexity ,g1()) * 11.09)) * sin(g2() / (sqrt(length(pos) * length(pos) + g5)) + timeswing * 2.618), g1());
	// fbm
    float pattern = signPow(fbm(pos + vec2(fbm(pos * g3() + timeswing), fbm(pos * g3() - timeswing)) + u_volume_smooth * g3()), g1());
	// erosion
	float rot = signPow(g5 * length(pos) * punch, g1());
	
    pos *= mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
	
	// coupling
	vec2 cq = vec2(0.0);
    cq.x = signPow(fbm(uv + 0.09 * timeswing), g1());
    cq.y = signPow(fbm(uv + vec2(g2())), g1());
    vec2 cr = vec2(0.0);
    cr.x = signPow(fbm(uv + g2() * cq + vec2(g1(), 11.09) + 0.1459 * timeswing), g1());
    cr.y = signPow(fbm(uv + g2() * cq + vec2(6.856, 2.618) + 0.09 * timeswing), g1());
	
    float cf = signPow(fbm(uv + cr), g2());
	
    float wave = signPow(g3() + 0.382 * sin(timeswing + pos.x * u_complexity) / (g5 + g3() * bigZ), g1());
    wave *= (g5 + u_volume_smooth);
	
    float sym = signPow(sin(timeswing * 0.382 + pos.x * u_complexity + bigZ) * (0.0557 + 0.618 * cos(timeswing * 0.618 + pos.y * u_intensity - bigZ)), 1.618) * 0.09;

    float motion = signPow(g3() + 0.382 * sin(timeswing + length(pos) * u_speed), 1.618);

    vec3 baseColor   = vec3(0.146, 0.236, 0.382);
    vec3 accentColor = vec3(g3(), g5, 0.382);
    vec3 peakColor   = vec3(g3(), g3(), g5);

    vec3 color = mix(baseColor, accentColor, wave);
    color = mix(color, peakColor, (g5 + u_peak));
	
	// regret
	mat3 rrot = rotateY(u_orient.x + timeswing * 0.382) * rotateX(u_orient.y + timeswing * 0.236);
	
    color *= sym * motion * signPow(g3() + g3() * u_intensity, g1()) / (g5 + g2() * pattern) * stripes / (g5 + g2() * cf);
	color *= rrot;
	
	// synapse
	color += g5 * quantizeVec3(color, 17.95);
	
	// love
	float resonance = signPow(sin(cr.x * 11.09) * sin(cr.y * 17.95) * (g5 + g3() * u_intensity), g2());
	
	float swing = sin(timeswing * 1.618 * PI * u_fps * u_bpm * length(color));
	
	float r = g5;
	float sum = 0.0;
    for(int i=0; i<7; i++){
		float fi = float(i);
        vec2 base = vec2(-g1() + fi * g2() + sin(sum), 0.0);
		
		vec3 col;
		
        col += vec3(drawBraille(pos, base, r, brailleCodes[i])) * signPow(g3() + g3() * u_volume_smooth / (g5 + punch), g1());
		
		// wave
		col /= g5 + g2() * map_wave(color);
		// count
        col += smoothstep(g3() * (g2() - (fi / g4)) * (g2() + u_volume_smooth), 0.0, length(uv + (fi * g5 * u_volume) - (g2() + fi * g5))) * (g2() - (fi / g4));
		// field
		col /= g5 + g2() * (g2() / (map_field(color, u_volume_smooth) + g3())) * (g5 + u_volume_smooth);
		// ridge
		col /= clamp(ridgeFBM(base), g5, g3());
		
		// thunder
		float fade = signPow(g3(), fi);
        color.r += col.r * fade * (g3() - u_left + 0.382 * swing);
        color.g += col.g * fade * (g3() - 0.236 * swing);
        color.b += col.b * fade * (g3() - u_right + 0.146 * swing);
		
		// prime
		color += g5 * primeWave(col, color, timeswing);
		
		// infinite
		sum += iwave(col, color, stripes, pattern);
    }
	
	vec3 finalColor = color * resonance;
	
	// HH
	finalColor /= g3() + (g2() - smoothstep(0.0, g2(), sym)) * g3();
	
	// water
	float noise = signPow(sin(uv.x * g4 + timeswing) * cos(uv.y * 6.856 - timeswing), g1());
    float turbulence = bigZ * 17.95 + noise * (0.382 + 0.618 * u_intensity);
	
	// torture
	float c = signPow(cos(turbulence * (g2() + u_left)), g1()), s = signPow(sin(turbulence * (g2() + u_right)), g1()); 
	mat4 rotZW = mat4(
		g2(), 0, 0, 0,
		0, g2(), 0, 0,
		0, 0,  c, -s,
		0, 0,  s,  c
	);
	
	vec3 leftCol = finalColor, rightCol = finalColor;
	
	vec3 past = texture2D(u_prevFrame, uv).rgb;
	
	// choice
	past += vec3(sin(u_intensity), cos(u_speed), sin(u_complexity));
	vec3 emission = color * abs(sym) * (u_volume_smooth * g3() + g3()) * g3();
	vec3 currentFrame = mix(past, emission, g2()); 
	finalColor = mix(currentFrame, past, g3() + g5 * freeze);
	
	float v_z_st = 0.0;
	float lrpunch = 0.382 + (u_left - u_right) * 6.856 * punch;
	
	if(u_darkGlow > 0.5) {
		if(v_uv.x < lrpunch) {
			// bubble
			if (v_z > (g3() + u_left) * wave || 0.618 * stripes > bigZ) discard;
		}
		else{
			// bubble
			if (v_z > 0.618 * wave || (g3() + u_right) * stripes > bigZ) discard;
		}
		
		if(v_uv.y > lrpunch) {
			// bubble
			if (v_z > lrpunch * wave || g3() * stripes > bigZ) discard;
		}
		else{
			// bubble
			if (v_z > g3() * wave || lrpunch * stripes > bigZ) discard;
		}
		leftCol = g2() - exp(-finalColor * g3());
	}
	else {
		if(v_uv.x < v_uv.y) {
			// bubble
			if (v_z > 0.618 * wave || g3() * stripes > bigZ) discard;
		}
		else{
			// bubble
			if (v_z > g3() * wave || 0.618 * stripes > bigZ) discard;
		}
		rightCol = g2() - exp(-finalColor * g3());
	}
	
	float t = smoothstep(g3() - g3() * punch, g3() + g3() * punch, length(dist) * sin(timeswing));
	finalColor = mix(leftCol, rightCol, t);
	
	finalColor = mix(finalColor, past, g2());
	
    r = length(vec3(v_uv * sin(timeswing), v_z * cos(timeswing)));
    float a = atan(v_uv.y * cos(timeswing), v_uv.x * sin(timeswing));
    
    float chaos = sin(a * g4 + t * 1.618) * cos(r * 17.95 - t * 4.237);
		
    pattern = sin(r * 17.95 - t * 6.856 + chaos * g1());
    pattern = smoothstep(-g5, g3(), pattern);
    
    float core = smoothstep(g5, 0.0, r);
    float corePulse = g3() + g3() * sin(t * 6.856);
    
    vec3 colBg = vec3(g3(), g5, g5);
    vec3 colDissipation = vec3(g2(), g3(), g5) * pattern * (g2() - a * g3());
    vec3 colWinner = vec3(1.0, g2(), g3()) * core * (g2() + corePulse * g3());

    finalColor /= g1() + colBg + colDissipation + colWinner;

    finalColor /= g1() + (g2() - r * g3());
    
    gl_FragColor = vec4(finalColor, g3());
	
	//gl_FragColor = vec4(0.118, 0.118, 0.118, 1.0);
}