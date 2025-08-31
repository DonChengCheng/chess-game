const { chromium } = require('playwright');

async function testStyles() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500 // 慢速执行便于观察
    });
    
    // 测试设备配置
    const devices = [
        { name: 'iPhone-12', width: 390, height: 844 },
        { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const device of devices) {
        console.log(`\n测试设备: ${device.name} (${device.width}x${device.height})`);
        
        const context = await browser.newContext({
            viewport: { width: device.width, height: device.height }
        });
        
        const page = await context.newPage();
        
        // 测试在线模式
        console.log('- 测试在线模式');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        // 截图
        await page.screenshot({ 
            path: `screenshots/game-${device.name}.png`,
            fullPage: true 
        });
        
        // 测试单机模式
        console.log('- 测试单机模式');
        await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
            path: `screenshots/index-${device.name}.png`,
            fullPage: true 
        });
        
        await context.close();
    }
    
    await browser.close();
    console.log('\n测试完成! 截图保存在 screenshots/ 目录');
}

// 创建截图目录
const fs = require('fs');
if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
}

testStyles().catch(console.error);