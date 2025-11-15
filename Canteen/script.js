// 二维码生成器
class QRCodeGenerator {
    constructor() {
        // 不再需要API地址，使用本地库生成
    }
    
    // 本地生成二维码并返回data URL
    generateQRCode(url, size = 180) {
        // 使用qrcode-generator库生成二维码
        // 0表示纠错级别，L表示低纠错级别
        const typeNumber = 0;
        const errorCorrectionLevel = 'L';
        const qr = qrcode(typeNumber, errorCorrectionLevel);
        qr.addData(url);
        qr.make();
        
        // 创建canvas元素
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        // 获取canvas上下文并清空
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);
        
        // 设置单元格大小和边距
        const moduleCount = qr.getModuleCount();
        // 计算精确的单元格大小，确保完全填充画布
        const cellSize = size / moduleCount;
        
        // 绘制二维码
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillStyle = '#000000';
                    // 使用精确的坐标和大小，避免空白
                    ctx.fillRect(
                        col * cellSize,
                        row * cellSize,
                        cellSize,
                        cellSize
                    );
                }
            }
        }
        
        // 返回data URL
        return canvas.toDataURL('image/png');
    }
    
    // 生成SVG占位符
    generateSVGPlaceholder(text, backgroundColor, textColor) {
        const svg = `
            <svg width="180" height="180" xmlns="http://www.w3.org/2000/svg">
                <rect width="180" height="180" fill="${backgroundColor}"/>
                <text x="50%" y="50%" text-anchor="middle" dy="0.3em" 
                      font-family="Arial, sans-serif" font-size="14" 
                      fill="${textColor}">${text}</text>
            </svg>
        `;
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }
}

// 数据读取器
class DataLoader {
    constructor() {
        this.dataPath = 'datas/';
    }
    
    // 加载所有分类数据
    async loadAllData() {
        const categories = ['白日梦', '罗大壮', '多喝汤'];
        const tableData = {};
        
        for (const category of categories) {
            try {
                const data = await this.loadCategoryData(category);
                tableData[category] = data;
            } catch (error) {
                console.warn(`无法加载分类"${category}"的数据:`, error);
                tableData[category] = [];
            }
        }
        
        return tableData;
    }
    
    // 加载单个分类数据
    async loadCategoryData(category) {
        const dataFile = `${this.dataPath}${category}/QRCode.json`;
        
        try {
            const response = await fetch(dataFile);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const jsonData = await response.json();
            return this.parseCategoryData(category, jsonData);
        } catch (error) {
            // 如果文件不存在或读取失败，返回空数组
            return [];
        }
    }
    
    // 解析分类数据
    parseCategoryData(category, jsonData) {
        const tables = [];
        let id = 1;
        
        for (const [tableNumber, url] of Object.entries(jsonData)) {
            tables.push({
                id: id++,
                number: tableNumber,
                url: url,
                isSpecial: tableNumber.includes('抽奖')
            });
        }
        
        return tables;
    }
}

// 全局变量
let tableData = {};
let qrGenerator = new QRCodeGenerator();
let dataLoader = new DataLoader();

// 添加页面加载动画
window.addEventListener('load', function() {
    // 显示页面内容的淡入效果
    document.body.classList.add('loaded');
});

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 获取分类元素和网格容器
    const categoryItems = document.querySelectorAll('.category-item');
    const tableGrid = document.querySelector('.table-grid');
    const searchInput = document.querySelector('.search-input');
    const menuBtn = document.querySelector('.menu-btn');
    const mainContent = document.querySelector('.main-content');
    
    // 添加页面加载类
    document.body.classList.add('loading');

    // 显示加载提示
    tableGrid.innerHTML = '<div class="loading-message">正在加载数据...</div>';
    
    try {
        // 加载数据
        tableData = await dataLoader.loadAllData();
        
        // 默认显示第一个分类的内容，添加初始加载过渡
        setTimeout(() => {
            renderTables('白日梦');
            // 添加内容进入动画
            mainContent.classList.add('content-loaded');
        }, 300);
    } catch (error) {
        console.error('数据加载失败:', error);
        tableGrid.innerHTML = '<div class="error-message">数据加载失败，请刷新页面重试</div>';
    }

    // 分类切换事件
    categoryItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有活动状态
            categoryItems.forEach(cat => cat.classList.remove('active'));
            // 添加当前活动状态
            this.classList.add('active');
            // 渲染对应的餐桌数据
            const category = this.textContent;
            
            // 添加切换动画
            tableGrid.classList.add('category-transition');
            tableGrid.style.opacity = '0';
            
            setTimeout(() => {
                renderTables(category);
                tableGrid.style.opacity = '1';
                setTimeout(() => {
                    tableGrid.classList.remove('category-transition');
                }, 300);
            }, 200);
        });
        
        // 添加触摸反馈
        if ('ontouchstart' in window) {
            item.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            });
            item.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.classList.remove('touch-active');
                }, 150);
            });
        }
    });

    // 搜索功能
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const activeCategory = document.querySelector('.category-item.active').textContent;
        
        // 添加搜索动画效果
        this.classList.add('searching');
        setTimeout(() => {
            this.classList.remove('searching');
        }, 300);
        
        if (searchTerm === '') {
            // 如果搜索框为空，显示当前分类的所有内容
            renderTables(activeCategory);
        } else {
            // 否则过滤显示匹配的餐桌
            const filteredTables = tableData[activeCategory].filter(table => 
                table.number.toLowerCase().includes(searchTerm)
            );
            renderFilteredTables(filteredTables);
        }
    });

    // 搜索按钮点击事件
    document.querySelector('.search-btn').addEventListener('click', function() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            // 模拟搜索操作
            searchInput.classList.add('searching');
            setTimeout(() => {
                searchInput.classList.remove('searching');
                // 触发input事件以执行搜索
                searchInput.dispatchEvent(new Event('input'));
            }, 300);
        }
    });

    // 允许通过回车键进行搜索
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.querySelector('.search-btn').click();
        }
    });

    // 菜单按钮点击事件
    menuBtn.addEventListener('click', function() {
        // 添加按钮点击动画
        this.classList.add('btn-clicked');
        setTimeout(() => {
            this.classList.remove('btn-clicked');
        }, 200);
        
        alert('菜单功能开发中...');
    });
    
    // 添加返回顶部功能（当页面内容较长时有用）
    if (window.innerHeight < 600) {
        const backToTopBtn = document.createElement('button');
        backToTopBtn.className = 'back-to-top';
        backToTopBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"/>
            </svg>
        `;
        document.body.appendChild(backToTopBtn);
        
        // 显示/隐藏返回顶部按钮
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });
        
        // 返回顶部功能
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // 渲染指定分类的餐桌
    function renderTables(category) {
        tableGrid.innerHTML = '';
        
        // 使用统一的网格布局
        tableGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        
        if (tableData[category] && tableData[category].length > 0) {
            // 使用延迟添加每个卡片，创建级联效果
            tableData[category].forEach((table, index) => {
                setTimeout(() => {
                    const card = createTableCard(table, category);
                    // 添加进入动画
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    
                    tableGrid.appendChild(card);
                    
                    // 触发重排后应用动画
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                }, index * 50);
            });
        } else {
            // 如果该分类没有数据，显示提示信息
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = '暂无数据';
            emptyMessage.style.gridColumn = '1 / -1';
            emptyMessage.style.padding = '50px 0';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.color = '#999';
            emptyMessage.style.opacity = '0';
            emptyMessage.style.transition = 'opacity 0.3s ease';
            
            tableGrid.appendChild(emptyMessage);
            
            // 显示提示信息的动画
            setTimeout(() => {
                emptyMessage.style.opacity = '1';
            }, 100);
        }
    }

    // 渲染过滤后的餐桌
    function renderFilteredTables(tables) {
        tableGrid.innerHTML = '';
        
        // 获取当前活动的分类
        const activeCategory = document.querySelector('.category-item.active').textContent;
        
        // 使用统一的网格布局
        tableGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        
        if (tables.length > 0) {
            tables.forEach(table => {
                const card = createTableCard(table, activeCategory);
                tableGrid.appendChild(card);
            });
        } else {
            const noResult = document.createElement('div');
            noResult.className = 'no-result';
            noResult.textContent = '未找到匹配的餐桌';
            noResult.style.gridColumn = '1 / -1';
            noResult.style.padding = '50px 0';
            noResult.style.textAlign = 'center';
            noResult.style.color = '#999';
            tableGrid.appendChild(noResult);
        }
    }

    // 创建餐桌卡片元素
    function createTableCard(table, category) {
        const card = document.createElement('div');
        
        // 检查是否为罗大壮餐厅的餐桌
        const isLuoDaZhuang = category === '罗大壮';
        
        card.className = 'table-card' + (table.isSpecial ? ' special-card' : '') + (isLuoDaZhuang ? ' luo-dazhuang-card' : '');
        
        if (isLuoDaZhuang) {
            // 罗大壮餐厅的简洁缩略图样式
            // 生成二维码或活动图片
            let imagePath;
            let altText = '';
            
            if (table.isSpecial) {
                // 特殊活动使用SVG生成彩色背景
                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                imagePath = qrGenerator.generateSVGPlaceholder(table.number, randomColor, '#FFFFFF');
                altText = table.number;
            } else if (table.url) {
                // 如果有URL，生成真实的二维码
                imagePath = qrGenerator.generateQRCode(table.url, 180);
                altText = '二维码';
            } else {
                // 普通餐桌使用SVG生成灰色背景
                imagePath = qrGenerator.generateSVGPlaceholder('扫码点餐', '#E8E8E8', '#666666');
                altText = '扫码点餐';
            }
            
            card.innerHTML = `
                <img src="${imagePath}" alt="${altText}" class="table-image">
                <div class="table-info">
                    <p class="table-number">${table.number}</p>
                    ${table.url ? '<p class="table-url">点击扫描二维码</p>' : ''}
                </div>
            `;
        } else {
            // 其他餐厅的默认样式
            // 生成二维码或活动图片
            let imagePath;
            let altText = '';
            
            if (table.isSpecial) {
                // 特殊活动使用SVG生成彩色背景
                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                imagePath = qrGenerator.generateSVGPlaceholder(table.number, randomColor, '#FFFFFF');
                altText = table.number;
            } else if (table.url) {
                // 如果有URL，生成真实的二维码
                imagePath = qrGenerator.generateQRCode(table.url, 180);
                altText = '二维码';
            } else {
                // 普通餐桌使用SVG生成灰色背景
                imagePath = qrGenerator.generateSVGPlaceholder('扫码点餐', '#E8E8E8', '#666666');
                altText = '扫码点餐';
            }
            
            card.innerHTML = `
                <img src="${imagePath}" alt="${altText}" class="table-image">
                <div class="table-info">
                    <p class="table-number">${table.number}</p>
                    ${table.url ? '<p class="table-url">点击扫描二维码</p>' : ''}
                </div>
            `;
        }
        
        // 添加点击事件
        card.addEventListener('click', function() {
            // 添加点击动画
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
                
                if (table.isSpecial) {
                    alert(`您点击了特殊活动: ${table.number}`);
                } else if (table.url) {
                    // 如果有URL，显示二维码弹窗
                    // 对于罗大壮餐厅，我们可以使用特殊的弹窗样式
                    if (isLuoDaZhuang) {
                        showQRCodeModal(table, true);
                    } else {
                        showQRCodeModal(table);
                    }
                } else {
                    alert(`您选择了餐桌: ${table.number}\n即将进入扫码点餐页面...`);
                }
            }, 150);
        });
        
        // 添加触摸反馈（针对移动设备）
        if ('ontouchstart' in window) {
            card.addEventListener('touchstart', function() {
                if (this) {
                    this.style.transform = 'scale(0.98)';
                }
            });
            card.addEventListener('touchend', function() {
                if (this) {
                    this.style.transform = 'scale(1)';
                }
            });
            card.addEventListener('touchmove', function() {
                if (this) {
                    this.style.transform = 'scale(1)';
                }
            });
        }
        
        // 添加轻微的加载动画
        const img = card.querySelector('.table-image');
        if (img) {
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.5s ease';
            img.onload = function() {
                this.style.opacity = '1';
            };
            
            // 图片加载失败时的处理
            img.onerror = function() {
                this.src = `https://via.placeholder.com/180x180?text=${encodeURIComponent('加载失败')}&bg=E8E8E8&text=FF6B6B`;
                this.style.opacity = '1';
            };
        }
        
        return card;
    }

    // 显示二维码弹窗
    function showQRCodeModal(table, isLuoDaZhuang = false) {
        // 创建弹窗容器
        const modal = document.createElement('div');
        modal.className = 'qr-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        if (isLuoDaZhuang) {
            // 罗大壮餐厅的特殊弹窗样式
            const qrCodePath = qrGenerator.generateQRCode(table.url, 250);
            
            modal.innerHTML = `
                <div class="qr-modal-content luo-dazhuang-modal">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <div style="background-color: #C37A3E; color: white; padding: 8px 15px; border-radius: 15px 0 0 15px; position: relative; display: inline-block; margin-bottom: 15px; font-size: 18px; font-weight: bold;">
                                扫码点餐
                                <div style="width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-left: 8px solid #C37A3E; position: absolute; right: -8px; top: 50%; transform: translateY(-50%);"></div>
                            </div>
                            <div style="font-size: 60px; margin: 0; color: white; font-weight: 900; letter-spacing: 3px;">${table.number}</div>
                        </div>
                        <div style="background: white; padding: 8px; border-radius: 8px;">
                            <img src="${qrCodePath}" 
                                 alt="二维码" 
                                 style="width: 250px; height: 250px;">
                        </div>
                    </div>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: white; text-align: center;">免费现熬红枣茶、小菜</p>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 24 24">
                            <path d="M12 6c3.87 0 7 3.13 7 7 0 1.93-.79 3.68-2 4.9V19h-2v-2.1a4.99 4.99 0 0 1-1-1.9c0-2.76-2.24-5-5-5s-5 2.24-5 5c0 .85.19 1.66.5 2.4L7 17.1v2.9h-2v-2.9c-1.21-1.22-2-2.97-2-4.9 0-3.87 3.13-7 7-7zm0 2c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z"/>
                        </svg>
                        <div style="color: white;">
                            <div style="font-size: 14px;">账号: 罗大壮牛肉面</div>
                            <div style="font-size: 14px;">密码: 88888888</div>
                        </div>
                    </div>
                    <button class="close-btn" style="
                        margin-top: 25px;
                        padding: 10px 30px;
                        background: white;
                        color: #D29966;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: 500;
                    ">关闭</button>
                </div>
            `;
        } else {
            // 默认弹窗样式
            modal.innerHTML = `
                <div class="qr-modal-content" style="
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    text-align: center;
                    max-width: 300px;
                    width: 80%;
                    transform: scale(0.8);
                    transition: transform 0.3s ease;
                ">
                    <h3 style="margin-bottom: 20px; color: #333;">${table.number}</h3>
                    <img src="${qrGenerator.generateQRCode(table.url, 200)}" 
                         alt="二维码" 
                         style="width: 200px; height: 200px; border-radius: 8px;">
                    <p style="margin-top: 15px; color: #666; font-size: 14px;">扫描二维码访问</p>
                    <button class="close-btn" style="
                        margin-top: 20px;
                        padding: 8px 20px;
                        background: #1890ff;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">关闭</button>
                </div>
            `;
        }

        // 添加到页面
        document.body.appendChild(modal);

        // 显示弹窗动画
        setTimeout(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('.qr-modal-content');
            content.style.transform = 'scale(1)';
        }, 10);

        // 关闭按钮事件
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', function() {
            closeModal(modal);
        });

        // 点击背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal(modal);
            }
        });

        // ESC键关闭
        const handleEscKey = function(e) {
            if (e.key === 'Escape') {
                closeModal(modal);
                document.removeEventListener('keydown', handleEscKey);
            }
        };
        document.addEventListener('keydown', handleEscKey);
    }

    // 关闭弹窗
    function closeModal(modal) {
        const content = modal.querySelector('.qr-modal-content');
        content.style.transform = 'scale(0.8)';
        modal.style.opacity = '0';
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
});