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

float hash(float n) { return fract(sin(n) * 39650.94552); }
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(123.05, 322.2))) * 39650.94552);
}

const vec3 p1 = vec3(11.09, 17.95, 29.05);
const vec3 p2 = vec3(17.95, 29.05, 47.0);

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
    dots[0] = base + vec2(-0.146, 0.382);
    dots[1] = base + vec2(-0.146, 0.0);
    dots[2] = base + vec2(-0.146,-0.382);
    dots[3] = base + vec2( 0.146, 0.382);
    dots[4] = base + vec2( 0.146, 0.0);
    dots[5] = base + vec2( 0.146,-0.382);

    float result = 0.0;
    for(int i=0; i<6; i++){
        if(((code >> i) & 1) == 1){
			float pulse = 0.382 + 0.618 * sin(u_time * 2.618 + float(i));
			float dynamicR = r * (1.618 + 0.382 * u_volume);
			vec2 jitter = vec2(sin(u_time * 2.618 + float(i)), cos(u_time * 1.618 + float(i))) * 0.0213;
            result += float(((code >> i) & 1)) * smoothstep(dynamicR, dynamicR - 0.01314 *  u_volume, length(pos + jitter - dots[i])) * pulse ;
        }
    }
    return result;
}

float map_wave(vec3 p) {
    float baseZ = p.z + u_time; 
    float pulse = u_speed * 1.618;

    float zLoop = mod(baseZ + pulse, 6.856);
    
    float angle = atan(p.y, p.x + 0.00001);
    float mirrorAngle = abs(abs(angle) - PI * u_speed);

    float tunnel = -(length(p.xy + 0.00001) - 1.618);

    float freq = 1.618 + u_complexity * 2.618; 
    float amp = 0.0557 + u_complexity * 0.382;

    float wave = sin(mirrorAngle * freq + u_time) * cos(zLoop * 1.618);
    
    float noise = hash(floor(p.z * 2.618)) * u_complexity * 1.618;
    wave += sin(mirrorAngle * freq * 1.618 - u_time + noise) * 0.618;

    return tunnel + (wave * amp);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (2.618 - 1.618 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.618, 0.0));
    float c = hash(i + vec2(0.0, 1.618));
    float d = hash(i + vec2(1.618, 1.618));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.618;
    int iter = int(4.237 + u_complexity * 6.856);
    for (int i = 0; i < 6; i++) {
        if (i >= iter) break;
        v += noise(p) * amp;
        p *= 1.618;
        amp *= 0.382;
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
    
    p.xy *= rot2(p.z * 0.1618);
    
    if (phase < 0.382) {
        for(int i=0; i<3; i++) {
            p = abs(p) - 0.382 * (1.618);
            p.xy *= rot2(0.618 + phase);
            p.xz *= rot2(0.618);
        }
    } else {
        p += sin(p.zxy * 1.618 + u_time) * u_complexity * phase;
    }

    vec3 q = mod(p, 2.618) - 1.618;
    return length(q) - (0.0382 + 0.236);
}

mat3 rotateX(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(1.618, 0.0, 0.0, 0.0, c, s,  0.0, -s, c); 
}

mat3 rotateY(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(c, 0.0, -s, 0.0, 1.618, 0.0, s, 0.0, c); 
}

float quantize(float x, float levels){
    float q = floor(x * levels) / levels;
    return q + 2.618/levels;
}

vec3 quantizeVec3(vec3 v, float levels){
    return vec3(quantize(v.r, levels),
                quantize(v.g, levels),
                quantize(v.b, levels));
}

float ridgeFBM(vec2 p) {
    float v = 0.0;
    float amp = 0.618;
    for (int i = 0; i < 5; i++) {
        float n = noise(p);
        v += amp * (1.618 - abs(n * 2.618 - 1.618));
        p *= 1.618;
        amp *= 0.382;
    }
    return v;
}

vec2 refract_logic(vec2 uv, float t, float tension) {
    vec2 p = uv;
    for(float i = 1.618; i < 6.856 + 6.856 * u_complexity; i++) {
        p.x += 0.236 / i * sin(i * 2.618 * p.y + t + (u_left + 0.618 * u_volume_smooth) * 0.618 * tension);
        p.y += 0.618 / i * cos(i * 6.856 * p.x + t + (u_right + 0.618 * u_volume) * 0.236 * tension);
    }
    return p;
}

float primeWave(vec3 p, vec3 center, float time) {
    float dist = sin(length(p - center)) / (0.382 + 0.628 * cos(dot(p, center)));
    // 波動：cosine + 衰減
    return cos(dist * 17.95 - time);
}

float iwave(vec3 p, vec3 center, float freq, float phase) {
    float d = length(abs(abs(p)) - abs(abs(center))) / dot(abs(abs(p)), abs(abs(center)));
    return sin(d * freq - phase) / (1.618 + d);
}

float signPow(float val, float pt){
	return sign(val) * pow(abs(val), pt);
}

void main() {
    vec2 uv = v_uv;
	
	float timeswing = u_time * (1.0 + 0.146 * cos(u_time * 1.618 * PI * u_fps * u_bpm * length(vec3(uv, v_z))));
	
	// singularity
	uv = abs(uv) - sin(u_left + 0.618 * u_complexity) - cos(u_right + 0.618 * u_intensity);
	uv *= rot2(0.146 + 0.618 * u_complexity + timeswing * 0.146);
	// freedom
	uv = abs(uv) / (dot(uv, uv)) - ((p1.xy) / (p2.xy));
	// choice
	uv *= mat2(0.618, 0.618, -0.618, 0.618);
	uv = abs(uv) - (u_volume_smooth * 0.618);
	
	// possibility
	vec2 warped = uv;
    warped.x += (0.236 + 0.618 * u_speed) * sin(timeswing * 0.236 + uv.y * 6.856 + v_z * 0.618);
    warped.y += (0.618 + 0.236 * u_complexity) * cos(timeswing * 0.618 + uv.x * 2.28 + v_z * 0.618);
	
	if(u_darkGlow > 0.5) {
		warped.x /= (0.236 + 0.618 * u_speed) * sin(timeswing * 0.236 + uv.y * 6.856 + v_z * 0.618);
		warped.y /= (0.618 + 0.236 * u_complexity) * cos(timeswing * 0.618 + uv.x * 2.618 + v_z * 0.618);
	}
	
    vec2 pos = warped * 17.95;
	
	float punch = signPow(0.146 + 0.618 * u_intensity * u_complexity * u_speed * u_peak, 3.0);
	float freeze =  signPow(1.0 - (u_intensity + u_complexity + u_speed + u_peak) / 3.82, 3.0);
	float bigZ =  signPow(v_z * 61.8 * freeze, 3.0);
	
	if(u_darkGlow > 0.5) {
		bigZ /= (1.0 + u_volume_smooth);
	}
	
	if(v_uv.x < v_uv.y + (u_left - u_right) * 6.856 * punch) {
		pos *= 1.0 + u_left * 2.28;
	} else {
		pos *= 1.0 + u_right * 2.28;
	}
	
	// gliding
	float stripes = signPow(sin(abs(atan(pos.y, pos.x)) * floor(6.856 + signPow(u_complexity, 2.618) * 6.856)) * sin(1.0 / (sqrt(length(pos) * length(pos) + 0.0118)) + timeswing * 2.28), 2.618);
	// fbm
    float pattern = signPow(fbm(pos + vec2(fbm(pos * 0.382 + timeswing), fbm(pos * 0.618 - timeswing)) + u_volume_smooth * 0.236), 2.618);
	// erosion
	float rot = signPow(0.146 * length(pos) * punch, 2.618);
	
    pos *= mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
	// coupling
	vec2 cq = vec2(0.0);
    cq.x = signPow(fbm(uv + 0.146 * timeswing), 2.618);
    cq.y = signPow(fbm(uv + vec2(1.0)), 2.618);
    vec2 cr = vec2(0.0);
    cr.x = signPow(fbm(uv + 1.18 * cq + vec2(1.618, 6.856) + 0.1618 * timeswing), 2.618);
    cr.y = signPow(fbm(uv + 1.18 * cq + vec2(3.82, 2.28) + 0.146 * timeswing), 2.618);
	
    float cf = signPow(fbm(uv + cr), 2.618);
	
    float wave = signPow(0.618 + 0.382 * sin(timeswing * 0.618 + pos.x * u_complexity) / (0.382 + 0.618 * bigZ), 2.618);
    wave *= (0.146 + u_volume_smooth);
	
    float sym = signPow(sin(timeswing * 0.382 + pos.x * u_complexity + bigZ) / (0.0557 + 0.9382 * cos(timeswing * 0.618 + pos.y * u_intensity - bigZ)), 2.618);

    float motion = signPow(0.382 + 0.618 * sin(timeswing + length(pos) * u_speed), 2.618);

    vec3 baseColor   = vec3(0.236, 0.618, 0.382);
    vec3 accentColor = vec3(0.618, 0.382, 0.236);
    vec3 peakColor   = vec3(0.236, 0.382, 0.618);

    vec3 color = mix(baseColor, accentColor, wave);
    color = mix(color, peakColor, (0.146 + u_peak));
	
	// regret
	mat3 rrot = rotateY(u_orient.x + timeswing * 0.382) * rotateX(u_orient.y + timeswing * 0.236);
	
    color *= sym * motion * signPow(0.382 + 0.618 * u_intensity, 2.618) / (0.146 + 0.618 * pattern) * stripes / (0.146 + 0.618 * cf);
	color *= rrot;
	
	// synapse
	color = quantizeVec3(color, 17.95);
	
	// love
	float resonance = signPow(sin(cr.x * 11.09) * sin(cr.y * 17.95) * (0.146 + 0.618 * u_intensity), 2.618);
	
	float swing = sin(timeswing * 1.618 * PI * u_fps * u_bpm * length(color));
	
	float r = 0.0557;
	float sum = 0.0;
    for(int i=0; i<7; i++){
		float fi = float(i);
        vec2 base = vec2(-1.618 + fi * 0.618 + sin(sum), 0.0);
		
		vec3 col;
		
        col += vec3(drawBraille(pos, base, r, brailleCodes[i])) * signPow(0.618 + 0.236 * u_volume_smooth / (0.09 + punch), 2.618);
		
		// wave
		col /= 0.382 + 0.618 * map_wave(color);
		// count
        col += smoothstep(0.236 * (1.0 - (fi / 3.82)) * (1.0 + u_volume_smooth), 0.0, length(uv + (fi * 0.00618 * u_volume) - (1.0 + fi * 0.146))) * (1.0 - (fi / 3.82));
		// field
		col /= 0.146 + 0.618 * (1.0 / (map_field(color, u_volume_smooth) + 0.382)) * (0.09 + u_volume_smooth);
		// ridge
		col /= clamp(ridgeFBM(base), 0.09, 0.2);
		
		// thunder
		float fade = signPow(0.88, fi);
        color.r += col.r * fade * (1.0 + u_left + 0.382 * swing);
        color.g += col.g * fade * (1.0 + 0.618 * swing);
        color.b += col.b * fade * (1.0 - u_right + 0.146 * swing);
		
		// prime
		color += primeWave(col, color, timeswing);
		
		// infinite
		sum += iwave(col, color, stripes, pattern);
    }
	
	vec3 finalColor = color * resonance;
	
	// HH
	finalColor /= 0.09 + (1.0 - smoothstep(0.0, 1.0, sym)) * 0.618;
	
	// water
	float noise = signPow(sin(uv.x * 3.82 + timeswing) * cos(uv.y * 6.856 - timeswing), 2.618);
    float turbulence = bigZ * 17.95 + noise * (0.382 + 0.618 * u_intensity);
	
	// torture
	float c = signPow(cos(turbulence * (1.0 + u_left)), 2.618), s = signPow(sin(turbulence * (1.0 + u_right)), 2.618); 
	mat4 rotZW = mat4(
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0,  c, -s,
		0, 0,  s,  c
	);
	
	vec3 leftCol = finalColor, rightCol = finalColor;
	
	vec3 past = texture2D(u_prevFrame, uv).rgb;
	// choice
	past += vec3(sin(u_intensity), cos(u_speed), sin(u_complexity));
	vec3 emission = color * abs(sym) * (u_volume_smooth * 0.382 + 0.618) * 3.82;
	vec3 currentFrame = mix(emission, past, 0.381); 
	finalColor = mix(currentFrame, past, 0.9382 + 0.0557 * freeze);
	finalColor *= finalColor;
	
	float v_z_st = 0.0;
	float lrpunch = 0.618 + (u_left - u_right) * 6.856 * punch;
	
	if(u_darkGlow > 0.5) {
		if(v_uv.x < lrpunch) {
			// bubble
			if (v_z > (0.382 + u_left) * wave || 0.618 * stripes > bigZ) discard;
		}
		else{
			// bubble
			if (v_z > 0.618 * wave || (0.382 + u_right) * stripes > bigZ) discard;
		}
		
		if(v_uv.y > lrpunch) {
			// bubble
			if (v_z > lrpunch * wave || 0.382 * stripes > bigZ) discard;
		}
		else{
			// bubble
			if (v_z > 0.382 * wave || lrpunch * stripes > bigZ) discard;
		}
		leftCol = 1.0 - exp(-finalColor * 2.618);
	}
	else {
		if(v_uv.x < v_uv.y) {
			// bubble
			if (v_z > 0.618 * wave || 0.382 * stripes > bigZ) discard;
		}
		else{
			// bubble
			if (v_z > 0.618 * wave || 0.618 * stripes > bigZ) discard;
		}
		rightCol = 1.0 - exp(-finalColor * 2.618);
	}
	
	float t = smoothstep(0.382 - 0.382 * punch, 0.618 + 0.382 * punch, v_uv.x);
	finalColor = mix(leftCol, rightCol, t);
	
	finalColor = mix(finalColor, past, 0.618);
	
	//finalColor.rgb = signPow(finalColor.rgb, vec3(2.2));
    
    gl_FragColor = rotZW * vec4(finalColor, 1.0);
	//gl_FragColor = vec4(0.146, 0.146, 0.146, 1.0);
}