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
	return signPow(0.618, -2.0 - u_intensity * 0.618);
}

float g3() {
	return signPow(0.618, 2.0 + u_complexity * 0.618);
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
    int iter = int(2.618 + u_complexity * 17.95);
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
	return mat3(g2(), 0.0, 0.0, 0.0, c, s,  0.0, -s, c); 
}

mat3 rotateY(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(c, 0.0, -s, 0.0, g2(), 0.0, s, 0.0, c); 
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
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	float g4 = signPow(0.618, -3.0 - abs(dist) * 0.618);
    float g5 = signPow(0.618, 3.0 + abs(dist) * 0.618);
	
	// singularity
	uv = abs(uv) - sin(g5 + g2() * u_complexity) - cos(g5 + g2() * u_intensity);
	uv *= rot2(g5 + g2() * u_complexity + local_t * 0.09);
	// freedom
	uv = abs(uv) / (dot(uv, uv)) - (p1.xy / p2.xy);
	// choice
	uv *= mat2(g3(), g3(), -g3(), g3());
	uv = abs(uv) - (u_volume_smooth * g3());
	
	// possibility
	vec2 warped = uv;
    warped.x += (g3() + g3() * u_speed) * sin(local_t * 0.382 + uv.y * g4 + v_z * g2());
    warped.y += (g3() + g3() * u_complexity) * cos(local_t * 0.618 + uv.x * g1() + v_z * g3());
	
	if(u_darkGlow > 0.5) {
		warped.x /= (g3() + g3() * u_speed) * sin(local_t * 0.3 + uv.y * g4 + v_z * g2());
		warped.y /= (g3() + g3() * u_complexity) * cos(local_t * 0.7 + uv.x * g1() + v_z * g3());
	}
	
    vec2 pos = warped * 17.95;
	
	float punch = signPow(g5 + g2() * u_intensity * u_complexity * u_speed * u_peak, g1());
	float freeze = g2() - (u_intensity + u_complexity + u_speed + u_peak) / g4;
	float bigZ = v_z * 76.05 * freeze;
	
	if(u_darkGlow > 0.618) {
		bigZ /= (g2() + u_volume_smooth);
	}
	
	if(v_uv.x < 0.5 + (u_left - u_right) * g4 * punch) {
		pos *= g2() + u_left * g4;
	} else {
		pos *= g2() + u_right * g4;
	}
	
	// gliding
	float stripes = sin(abs(atan(pos.y, pos.x)) * floor(g4 + signPow(u_complexity ,g1()) * 11.09)) * sin(g2() / (sqrt(length(pos) * length(pos) + g5)) + local_t * 2.618);
	// fbm
    float pattern = fbm(pos + vec2(fbm(pos * g3() + local_t), fbm(pos * g3() - local_t)) + u_volume_smooth * g3());
	// erosion
	float rot = g5 * length(pos) * punch;
	
    pos *= mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
	
	// coupling
	vec2 cq = vec2(0.0);
    cq.x = fbm(uv + 0.09 * local_t);
    cq.y = fbm(uv + vec2(g2()));
    vec2 cr = vec2(0.0);
    cr.x = fbm(uv + g2() * cq + vec2(g1(), 11.09) + 0.1459 * local_t);
    cr.y = fbm(uv + g2() * cq + vec2(6.856, 2.618) + 0.09 * local_t);
	
    float cf = fbm(uv + cr);
	
    float wave = signPow(g3() + 0.382 * sin(local_t + pos.x * u_complexity) / (g5 + g3() * bigZ), 3.0);
    wave *= u_volume_smooth;

    float sym = signPow(sin(local_t + pos.x * u_complexity + bigZ) / (0.382 + 0.618 * cos(pos.y * u_intensity - bigZ)), 3.0);

    float motion = signPow(g3() + 0.382 * sin(local_t + length(pos) * u_speed), 3.0);

    vec3 baseColor   = vec3(0.1, 0.2, 0.3);
    vec3 accentColor = vec3(g2(), g5, 0.3);
    vec3 peakColor   = vec3(g3(), g2(), g5);

    vec3 color = mix(baseColor, accentColor, wave);
    color = mix(color, peakColor, (g5 + u_peak));
	
	// regret
	mat3 rrot = rotateY(u_orient.x + local_t * 0.618) * rotateX(u_orient.y + local_t * 0.382);
	
    color *= sym * motion * signPow(g3() + g2() * u_intensity, g1()) / (g5 + g2() * pattern) * stripes / (g5 + g2() * cf);
	color *= rrot;
	
	// synapse
	color = quantizeVec3(color, 17.95);
	
	// love
	float resonance = sin(cr.x * 17.95) * sin(cr.y * 17.95) * (g5 + g3() * u_intensity);
	
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
		float fade = signPow(g2(), fi);
        color.r += col.r * fade * g2();
        color.g += col.g * fade;
        color.b += col.b * fade * g3();
		
		// prime
		color += primeWave(col, color, local_t) * g3() + g3();
		
		// infinite
		sum += iwave(col, color, stripes, pattern);
    }
	
	vec3 finalColor = color * resonance;
	
	// HH
	finalColor /= g5 + (g2() - smoothstep(0.0, g2(), sym)) * g3();
	
	// water
	float noise = sin(uv.x * g4 + local_t) * cos(uv.y * 6.856 - local_t);
    float turbulence = v_z * 11.09 + noise * (g3() + g2() * u_intensity);
	
	// torture
	float c = cos(turbulence), s = sin(turbulence); 
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
	vec3 emission = color * abs(sym) * (u_volume_smooth * g3() + g3()) * g4;
	vec3 currentFrame = mix(past, emission, g3()); 
	finalColor = mix(currentFrame, past, g2() + g5 * freeze);
	finalColor *= finalColor; 
	
	float v_z_st = 0.0;
	
	if(u_darkGlow > 0.5) {
		if(v_uv.x < g3() + (u_left - u_right) * g4 * punch) {
			// bubble
			if (v_z > (g3() + u_left) * wave || g2() * stripes > bigZ) discard;
		}
		else{
			// bubble
			if (v_z > g2() * wave || (g3() + u_right) * stripes > bigZ) discard;
		}
		leftCol = g2() - exp(-finalColor * g3());
	}
	else {
		if(v_uv.x < 0.5) {
			// bubble
			if (v_z > g2() * wave || g3() * stripes > bigZ) discard;
		}
		else{
			// bubble
			if (v_z > g3() * wave || g1() * stripes > bigZ) discard;
		}
		rightCol = g2() - exp(-finalColor * g3());
	}
	
	float t = smoothstep(g3() - g3() * punch, g2() + g3() * punch, v_uv.x);
	finalColor = mix(leftCol, rightCol, t);
	
	finalColor = mix(finalColor, past, g3());
    
    gl_FragColor = rotZW * vec4(finalColor, g2());
}