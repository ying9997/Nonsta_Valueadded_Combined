// upload data to bitable
// @ts-nocheck

async function main({ params }: Args): Promise<Output> {

    const tenant_access_token = params.tenant_access_token;
    const table_id = 'tbl3XLmGtZUm658z';
    const app_token = 'WLG8buT7GaNonvs2KMLc8V5CnEg';

    // 先获取表格的字段结构
    const fieldsSchema = await get_bitable_fields(tenant_access_token, app_token, table_id);
    
    // 创建字段名到字段类型的映射
    const fieldTypeMap: any = {};
    if (fieldsSchema.data && fieldsSchema.data.items) {
        fieldsSchema.data.items.forEach((field: any) => {
            fieldTypeMap[field.field_name] = field.type;
        });
    }

    // json file like "data_format.json"
    const data_json = params.data_json;
    const data = JSON.parse(data_json);

    // 将 JSON 数据转换为多维表格记录格式
    var records: any[] = [];
    for (const item of data) {
        // 构建 fields 对象，包含所有字段
        var fields: any = {};
        
        // 遍历 item 的所有字段，将它们都添加到 fields 中
        for (const key in item) {
            if (item.hasOwnProperty(key)) {
                var value = item[key];
                var fieldType = fieldTypeMap[key];
                
                // 根据字段类型转换数据
                var convertedValue = convertValueByFieldType(key, value, fieldType);
                
                // 如果转换后的值为 null 或 undefined，跳过该字段
                if (convertedValue === null || convertedValue === undefined) {
                    continue;
                }
                
                fields[key] = convertedValue;
            }
        }
        
        // 确保 sys_op_flag 设置为 pending
        fields["sys_op_flag"] = "pending";
        fields["messages"] = item["对话内容"] || "";
        // 移除fields["对话内容"]
        delete fields["对话内容"];
        
        const record = {
            "fields": fields
        };
        records.push(record);
    }

    // 批量创建记录（每批最多500条，飞书API限制）
    const batchSize = 200;

    var successCount = 0;
    var failCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const response = await batch_create_bitable_records(tenant_access_token, batch, app_token, table_id);

        if (response.code === 0) {
            successCount += batch.length;
        } else {
            failCount += batch.length;
        }
    }

    // 构建输出对象
    const ret = {
        "result": successCount > 0 ? "success" : "error",
        "total": records.length,
        "success_count": successCount,
        "fail_count": failCount,
    };

    return ret;
}

// 获取表格的字段结构
async function get_bitable_fields(tenant_access_token: string, app_token: string, table_id: string): Promise<any> {
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/fields`;
    const headers = {
        'Authorization': `Bearer ${tenant_access_token}`,
        'Content-Type': 'application/json',
    };
    const response = await fetch(url, {
        method: 'GET',
        headers: headers,
    });
    const response_body = await response.json();
    return response_body;
}

// 根据字段类型转换值
// 字段类型参考：
// 1：文本, 2：数字, 3：单选, 4：多选, 5：日期, 7：复选框, 11：人员, 13：电话号码, 15：超链接,
// 17：附件, 18：关联, 20：公式, 21：双向关联, 22：地理位置, 23：群组,
// 1001：创建时间, 1002：最后更新时间, 1003：创建人, 1004：修改人, 1005：自动编号
function convertValueByFieldType(fieldName: string, value: any, fieldType: number): any {
    // 如果值为 null 或 undefined，返回 null（跳过该字段）
    if (value === null || value === undefined) {
        return null;
    }
    
    // 超链接类型 (15)
    if (fieldType === 15) {
        if (typeof value === "string" && value.trim() !== "") {
            var urlValue = value.trim();
            // 如果是邮箱，添加 mailto: 前缀
            if (fieldName.includes("邮箱") || urlValue.includes("@")) {
                var emailValue = urlValue;
                return {
                    "link": emailValue.startsWith("mailto:") ? emailValue : `mailto:${emailValue}`,
                    "text": emailValue
                };
            } else {
                // 如果是URL，添加 https:// 前缀（如果没有协议）
                var linkUrl = urlValue.startsWith("http://") || urlValue.startsWith("https://") 
                    ? urlValue 
                    : `https://${urlValue}`;
                return {
                    "link": linkUrl,
                    "text": urlValue
                };
            }
        }
        return null;
    }
    
    // 多选类型 (4)
    if (fieldType === 4) {
        if (Array.isArray(value)) {
            return value;
        } else if (typeof value === "string" && value.trim() !== "") {
            return [value.trim()];
        }
        return null;
    }
    
    // 日期类型 (5)
    if (fieldType === 5) {
        if (typeof value === "number") {
            // 根据字段名选择不同的格式
            if (fieldName.includes("时分秒")) {
                // 时分秒格式：0:07:21
                return convertExcelTimeToDurationString(value);
            } else if (fieldName === "对话开始时间" || fieldName === "排队开始时间") {
                // 日期时间格式：2025-12-01 09:30:11
                return convertExcelDateToDateTimeString(value);
            } else {
                // 默认使用日期时间格式
                return convertExcelDateToDateTimeString(value);
            }
        }
        return value;
    }
    
    // 文本类型 (1)
    if (fieldType === 1) {
        if (typeof value === "number") {
            // 如果是数字，检查是否是时间字段
            if (fieldName.includes("时分秒")) {
                return convertExcelTimeToDurationString(value);
            } else if (fieldName.includes("时间")) {
                if (fieldName === "对话开始时间" || fieldName === "排队开始时间") {
                    return convertExcelDateToDateTimeString(value);
                } else {
                    return convertExcelDateToDateTimeString(value);
                }
            }
            // 其他数字字段转换为字符串
            return String(value);
        }
        return value;
    }
    
    // 其他类型直接返回原值
    return value;
}

// 将 Excel 日期序列号转换为日期时间字符串格式：2025-12-01 09:30:11
// Excel 日期序列号：从 1900-01-01 开始的天数（小数部分表示时间）
// Excel 错误地认为 1900 是闰年，所以实际从 1899-12-30 开始计算
function convertExcelDateToDateTimeString(excelDate: number): string {
    // Excel 日期序列号：1 = 1900-01-01
    // 从 1899-12-30 开始计算（因为 Excel 的 1900 年错误）
    const excelEpoch = new Date(1899, 11, 30); // 1899-12-30 (月份从0开始，11=12月)
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    
    // 获取整数部分（天数）和小数部分（时间）
    const days = Math.floor(excelDate);
    const timeFraction = excelDate - days;
    
    // 计算日期：Excel 日期序列号 1 = 1900-01-01
    // 从 1899-12-30 开始，需要加 2 天才能到 1900-01-01
    // 所以：days = 1 时，应该加 2 天 = days + 1
    const date = new Date(excelEpoch.getTime() + (days + 1) * millisecondsPerDay);
    
    // 添加时间部分（小数部分转换为毫秒）
    const totalMilliseconds = timeFraction * millisecondsPerDay;
    const hours = Math.floor(totalMilliseconds / (60 * 60 * 1000));
    const minutes = Math.floor((totalMilliseconds % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((totalMilliseconds % (60 * 1000)) / 1000);
    
    date.setHours(hours, minutes, seconds, 0);
    
    // 格式化为 YYYY-MM-DD HH:mm:ss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// 将 Excel 时间（天数）转换为时分秒格式：0:07:21
// Excel 时间：小数部分表示时间，例如 0.0000925925925925926 表示约 8 秒
function convertExcelTimeToDurationString(excelTime: number): string {
    // Excel 时间：1 = 24小时，所以小数部分就是时间比例
    const totalSeconds = Math.round(excelTime * 24 * 60 * 60);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // 格式化为 H:mm:ss
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function batch_create_bitable_records(tenant_access_token: string, records: any[], app_token: string, table_id: string): Promise<any> {
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/batch_create`;
    const headers = {
        'Authorization': `Bearer ${tenant_access_token}`,
        'Content-Type': 'application/json',
    };
    const body = {
        'records': records,
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
    });
    const response_body = await response.json();
    return response_body;
}