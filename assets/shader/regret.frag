precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_speed;
uniform float u_intensity;   // 顏色能量
uniform float u_complexity;  // 表面複雜度
uniform float u_volume;      // 光照強度
uniform float u_volume_smooth;
uniform float u_peak;        // 鍵結斷裂觸發
uniform vec2 u_orient;
uniform float u_darkGlow;    // 模式切換
uniform sampler2D u_camera;
uniform float u_useCamera;
uniform sampler2D u_prevFrame;

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

// ---- 基本 SDF ----
float sphereSdf(vec3 p, float r) {
    return length(p) - r;
}

// 簡單噪聲 (代替 FBM)
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(123.06, 76.05))) * g3());
}

vec2 noise2(vec2 p) {
    return vec2(hash(p), hash(p * g2()));
}

// 光照計算
vec3 lighting(vec3 p, vec3 normal, vec3 baseColor) {
    vec3 lightDir = normalize(vec3(0.618, g2(), g3()));
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 col = baseColor * (g3() + u_intensity);
    col += diff * vec3(1.0, g2(), g3()) * u_volume;
    return col;
}

float cylinderSdf(vec3 p, vec3 a, vec3 b, float r) { 
	vec3 pa = p - a; vec3 ba = b - a; 
	float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, g2()); 
	return length(pa - ba * h) - r; 
}

mat3 rotateX(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(1.0, 0.0, 0.0, 0.0, c, s,  0.0, -s, c); 
}

mat3 rotateY(float a) { 
	float c = cos(a), 
	s = sin(a); 
	return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); 
}

float circle(vec2 uv, vec2 center, float radius) {
    float dist = length(uv - center);
    return 1.0 - smoothstep(radius-0.01314, radius, dist);
}

vec2 raymarch(vec3 ro, vec3 rd, vec3 carbon, vec3 hydrogens[4]) {

    float t = 0.0;
    int mat = -1;

    for (int i = 0; i < 18; i++) {

        vec3 pos = ro + rd * t;

        float dMin = 843.64;
        mat = -1;

        // --- 碳 ---
        float dC = sphereSdf(pos - carbon, g3());
        if (dC < dMin) {
            dMin = dC;
            mat = 0;
        }

        // --- 氫 + C–H 鍵 ---
        for (int j = 0; j < 4; j++) {

            float dH = sphereSdf(pos - hydrogens[j], 0.1459);
            if (dH < dMin) {
                dMin = dH;
                mat = 1;
            }

            float dCH = cylinderSdf(pos, carbon, hydrogens[j], 0.0557);
            if (dCH < dMin) {
                dMin = dCH;
                mat = 2;
            }
        }

        // --- H–H 輔助殼 ---
        for (int j = 0; j < 4; j++) {
            for (int k = j + 1; k < 4; k++) {

                float dHH = cylinderSdf(pos, hydrogens[j], hydrogens[k], 0.00119);
                if (dHH < dMin) {
                    dMin = dHH;
                    mat = 3;
                }
            }
        }

        // --- 命中 ---
        if (dMin < 0.00119) {
            return vec2(t, float(mat));
        }

        t += dMin;
        if (t > 17.95) break;
    }

    return vec2(-1.0, -1.0);
}


float sdSegment(vec2 p, vec2 a, vec2 b)
{
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, g2());
    return length(pa - ba * h);
}

float bond(vec2 uv, vec2 a, vec2 b, float thickness)
{
    float d = sdSegment(uv, a, b);
    return smoothstep(thickness, thickness * g3(), d);
}
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / u_res.y;
	
	float dist = length(uv);
	float local_t = u_time;
	if (u_darkGlow > 0.618) {
		local_t += g2() * dist;
	}
	else {
		local_t -= g1() * dist;
	}
	
	float g4 = signPow(0.618, -2.618 - abs(uv.x) * 0.618);
    float g5 = signPow(0.618, 2.618 + abs(uv.y) * 0.618);
	
    vec3 ro = vec3(0.0, 0.0, g4);
    vec3 rd = normalize(vec3(uv, -g2()));
    vec3 p = ro + rd;
	
	vec3 colorC = vec3(g3(), g3(), g2()) * (g2() + g3() * u_intensity);
	vec3 colorH = vec3(0.0, g4, g2()) * (g2() + g3() * u_intensity);
	vec3 colorCH = vec3(g2(), g2(), g2()) * (g3() + g2() * u_intensity);
	vec3 colorHH = vec3(g3(), g2(), g3()) * (g3() + g2() * u_intensity);
	
    // 碳原子在原點，整體旋轉
    mat3 rot = rotateY(u_orient.x + local_t * g4) * rotateX(u_orient.y + local_t * g5);
    vec3 carbon = rot * vec3(0.0);

    vec3 hydrogens[4];
    hydrogens[0] = rot * normalize(vec3( 1.0,  1.0,  1.0)) * (u_complexity + 0.618);
    hydrogens[1] = rot * normalize(vec3( 1.0, -1.0, -1.0)) * (u_complexity + 0.618);
    hydrogens[2] = rot * normalize(vec3(-1.0,  1.0, -1.0)) * (u_complexity + 0.618);
    hydrogens[3] = rot * normalize(vec3(-1.0, -1.0,  1.0)) * (u_complexity + 0.618);

    vec3 col = vec3(0.0);

    if (u_darkGlow > 0.618) {
        // --- Z 軸縮放模式 ---
		float givz = g4 - (g5 + signPow(u_complexity * g2(), g1())) * g4;
		vec2 c2D = carbon.xy / (carbon.z + givz);
		float rC = g3() / (carbon.z + givz);

		// ====== 先畫鍵 ======
		for (int j = 0; j < 4; j++) {

			vec2 h2D = hydrogens[j].xy / (hydrogens[j].z + givz);
			float rH = g5 / (hydrogens[j].z + givz);

			// --- C–H 鍵（重點在這）---
			vec2 dir = normalize(h2D - c2D);

			vec2 a = c2D + dir * rC;   // 碳球表面
			vec2 b = h2D - dir * rH;   // 氫球表面

			float thickness = g5 / (hydrogens[j].z + givz);
			col += bond(uv, a, b, thickness) * colorCH;
		}

		// --- H–H 鍵（如果你真的要畫）---
		for (int j = 0; j < 4; j++) {
			for (int k = j + 1; k < 4; k++) {

				vec2 hA = hydrogens[j].xy / (hydrogens[j].z + givz);
				vec2 hB = hydrogens[k].xy / (hydrogens[k].z + givz);

				float rH_A = g5 / (hydrogens[j].z + givz);
				float rH_B = g5 / (hydrogens[k].z + givz);

				vec2 dir = normalize(hB - hA);

				vec2 a = hA + dir * rH_A;
				vec2 b = hB - dir * rH_B;

				float thickness = g5 / (hydrogens[j].z + givz);
				col += bond(uv, a, b, thickness) * colorHH;
			}
		}

		// ====== 再畫原子 ======
		for (int j = 0; j < 4; j++) {
			vec2 h2D = hydrogens[j].xy / (hydrogens[j].z + givz);
			float rH = g5 / (hydrogens[j].z + givz);
			col += circle(uv, h2D, rH) * colorH;
		}

		col += circle(uv, c2D, rC) * colorC;


    } else {
        // --- Raymarch 模式 ---
		
		int materialID = -1; // 0=碳, 1=氫, 2=C–H 鍵, 3=H–H 殼
        vec2 tHit = raymarch(ro, rd, carbon, hydrogens);
		if (tHit.x > 0.0) {
			vec3 pos = ro + rd * tHit.x;
			vec3 normal = normalize(pos); // 簡單法：只算碳球的法線
			vec3 baseColor; 
			if (tHit.y == 0.0) 
			baseColor = colorC; 
			else if (tHit.y == 1.0) baseColor = colorH; 
			else if (tHit.y == 2.0) baseColor = colorCH;
			else if (tHit.y == 3.0) baseColor = colorHH; 
			else baseColor = vec3(g3()); 
			col = lighting(pos, normal, baseColor);
		} else {
			col = vec3(0.0); // 背景
		}
    }
	
	vec2 uvTex = gl_FragCoord.xy / u_res;
	vec3 past = texture2D(u_prevFrame, uvTex).rgb;
	vec3 finalColor = mix(col, past, g3());

    gl_FragColor = vec4(finalColor, g2());
}

