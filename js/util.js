async initGyro(config = {}, onUpdate = null) {
    const settings = {
        range: config.range || 45,
        ...config
    };

    let baseQ = null;

    // 將尤拉角轉為四元數的內部函式 (解決 iOS/Android 數據不穩的問題)
    const eulerToQuaternion = (alpha, beta, gamma) => {
        const _x = beta  ? beta  * (Math.PI / 180) : 0;
        const _y = gamma ? gamma * (Math.PI / 180) : 0;
        const _z = alpha ? alpha * (Math.PI / 180) : 0;

        const cX = Math.cos(_x / 2);
        const sX = Math.sin(_x / 2);
        const cY = Math.cos(_y / 2);
        const sY = Math.sin(_y / 2);
        const cZ = Math.cos(_z / 2);
        const sZ = Math.sin(_z / 2);

        return [
            sX * cY * cZ - cX * sY * sZ,
            cX * sY * cZ + sX * cY * sZ,
            cX * cY * sZ + sX * sY * cZ,
            cX * cY * cZ - sX * sY * sZ
        ];
    };

    const handleOrientation = (event) => {
        // 1. 取得當前四元數
        const currentQ = eulerToQuaternion(event.alpha, event.beta, event.gamma);

        // 2. 紀錄初始朝向基準
        if (baseQ === null) {
            baseQ = currentQ;
            return;
        }

        // 3. 提取方向向量分量 (投影法)
        // 這幾行數學公式能直接從四元數提取「左右」與「前後」的變化量
        // 它天生具有抗瞬跳特性，不需要再寫 SAFE_ZONE 或 lastSafeDeltaX
        const qx = currentQ[0], qy = currentQ[1], qz = currentQ[2], qw = currentQ[3];
        
        // 投影到虛擬 XY 平面
        const dx = 2 * (qx * qz + qw * qy);
        const dy = 2 * (qy * qz - qw * qx);

        // 4. 歸一化處理 (對接到你的 settings.range)
        // 這裡乘以一個係數 (約 1.5~2.0) 來匹配原本角度的操作手感
        const sensitivity = 90 / settings.range;
        
        const data = {
            x: Math.max(-1, Math.min(1, dx * sensitivity)),
            y: Math.max(-1, Math.min(1, dy * sensitivity)),
            raw: { q: currentQ }
        };

        if (onUpdate) onUpdate(data);
    };

    // iOS 授權邏輯 (保持不變)
    let granted = false;
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            granted = (permission === 'granted');
        } catch (e) {
            console.error("Gyro permission denied", e);
        }
    } else {
        granted = true;
    }

    if (granted) {
        window.addEventListener('deviceorientation', handleOrientation);
    }

    return {
        success: granted,
        reset: () => { baseQ = null; },
        stop: () => window.removeEventListener('deviceorientation', handleOrientation)
    };
}
