// 题库管理服务

// 缓存题库数据
let bankDataCache = null;

/**
 * 获取题库名称
 * @param {string} bankName 题库标识
 * @returns {string} 题库显示名称
 */
export async function getBankName(bankName) {
    // 如果缓存中有数据，直接使用缓存
    if (bankDataCache && bankDataCache[bankName]) {
        return bankDataCache[bankName].bank_name;
    }
    
    // 尝试从 JSON 文件加载题库数据
    try {
        const response = await fetch('./static/bank/bank.json');
        if (response.ok) {
            bankDataCache = await response.json();
            if (bankDataCache[bankName]) {
                return bankDataCache[bankName].bank_name;
            }
        }
    } catch (error) {
        console.warn('无法加载题库列表，使用默认名称:', error);
    }
    
    // 如果 JSON 文件中没有找到，使用默认的题库名称映射
    const defaultNames = {
        general: '综合题库',
        aws_mls_c01_example: 'AWS-MLS(C01) Example',
        aws_mls_c01_all: 'AWS-MLS(C01) ALL',
        aws_mls_c01_all_doubao: 'AWS-MLS(C01) DouBao',
        aws_mls_c01_all_deepseek: 'AWS-MLS(C01) DeepSeek',
        acp_ai_pro_single: 'ACP 人工智能高级(单选题)',
        acp_ai_pro_numbers: 'ACP 人工智能高级(数字)',
        acp_ai_pro_errors: 'ACP 人工智能高级(错题集)',
        acp_ai_pro_single_example: 'ACP 人工智能高级(单选题) Example',
        acp_ai_pro_multi: 'ACP 人工智能高级(多选题)',
        acp_ai_pro_error: 'ACP 人工智能高级(错题集)',
        acp_ai_pro_number: 'ACP 人工智能高级(数字)',
        aws_mls_c01_single: 'AWS-MLS(C01)(单选题)',
        aws_mls_c01_multi: 'AWS-MLS(C01)(多选题)'
    };
    
    return defaultNames[bankName] || '未知题库';
}

/**
 * 检查答案是否正确
 * @param {Object} question 题目对象
 * @param {Array|Object} userAnswer 用户答案（可以是数组或包含options的对象）
 * @returns {boolean} 是否正确
 */
export function isCorrectAnswer(question, userAnswer) {
    // 验证题目对象和选项数组是否存在
    if (!question || !question.option || !Array.isArray(question.option)) {
        console.error('无效的题目对象:', question);
        return false;
    }
    
    // 处理新格式的用户答案
    let userOptions;
    if (Array.isArray(userAnswer)) {
        userOptions = userAnswer;
    } else if (userAnswer && userAnswer.options && Array.isArray(userAnswer.options)) {
        userOptions = userAnswer.options;
    } else {
        console.error('无效的用户答案:', userAnswer);
        return false;
    }
    
    const correctAnswers = question.option
        .map((opt, index) => opt.option_flag ? index : -1)
        .filter(index => index !== -1);

    if (correctAnswers.length !== userOptions.length) return false;

    return correctAnswers.every(ans => userOptions.includes(ans));
}

/**
 * 检查多选题是否有漏选情况
 * @param {Object} question 题目对象
 * @param {Array|Object} userAnswer 用户答案
 * @returns {boolean} 是否有漏选
 */
export function hasMissedOptions(question, userAnswer) {
    // 验证题目对象和选项数组是否存在
    if (!question || !question.option || !Array.isArray(question.option)) {
        console.error('无效的题目对象:', question);
        return false;
    }
    
    // 处理新格式的用户答案
    let userOptions;
    if (Array.isArray(userAnswer)) {
        userOptions = userAnswer;
    } else if (userAnswer && userAnswer.options && Array.isArray(userAnswer.options)) {
        userOptions = userAnswer.options;
    } else {
        console.error('无效的用户答案:', userAnswer);
        return false;
    }
    
    const correctAnswers = question.option
        .map((opt, index) => opt.option_flag ? index : -1)
        .filter(index => index !== -1);
    
    // 如果用户没有选择任何正确答案，说明有漏选
    const hasCorrectSelected = correctAnswers.some(ans => userOptions.includes(ans));
    const hasAllCorrect = correctAnswers.every(ans => userOptions.includes(ans));
    
    // 有正确答案被选中但不是全部正确答案都被选中，说明有漏选
    return hasCorrectSelected && !hasAllCorrect;
}

/**
 * 加载题库数据
 * @param {string} bankName 题库名称
 * @returns {Promise<Array>} 题目数组
 */
export async function loadBankData(bankName) {
    try {
        // 首先尝试从 JSON 文件获取题库路径
        if (!bankDataCache) {
            const response = await fetch('./static/bank/bank.json');
            if (response.ok) {
                bankDataCache = await response.json();
            }
        }
        
        let response = null;
        
        // 如果缓存中有题库数据，使用指定的路径
        if (bankDataCache && bankDataCache[bankName]) {
            response = await fetch(bankDataCache[bankName].bank_file);
        } else {
            // 回退到原来的硬编码路径逻辑
            if (bankName.toLowerCase().includes('aws')) {
                if (bankName.toLowerCase().includes('mls')) {
                    response = await fetch(`./static/AWS/MLS/${bankName}.json`);
                } else {
                    response = await fetch(`./static/AWS/${bankName}.json`);
                }
            } else if (bankName.toLowerCase().includes('acp')) {
                if (bankName.toLowerCase().includes('ai_pro')) {
                    response = await fetch(`./static/ACP/AIPRO/${bankName}.json`);
                } else {
                    response = await fetch(`./static/ACP/${bankName}.json`);
                }
            } else {
                response = await fetch(`./static/${bankName}.json`);
            }
        }

        if (!response.ok) {
            throw new Error(`无法加载题库: ${bankName}`);
        }

        return await response.json();
    } catch (error) {
        console.error('加载题库失败:', error);
        throw error;
    }
}

/**
 * 从题库中随机抽取题目
 * @param {Array} questions 题目数组
 * @param {number} count 抽取数量
 * @returns {Array} 抽取的题目
 */
export function getRandomQuestions(questions, count) {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}