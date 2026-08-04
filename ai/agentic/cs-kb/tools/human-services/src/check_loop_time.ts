async function main({ params }: Args): Promise<Output> {

    
    const timeLimit = 40 * 1000; // 40秒 = 40000毫秒
    const start_time = params.start_time;

    const current_time = new Date().toISOString();

    // if current_time - start_time > 40 sec, return "true"
    // 将 ISO 字符串转换为 Date 对象，计算时间差（毫秒）
    const startDate = new Date(start_time);
    const currentDate = new Date(current_time);
    const timeDiff = currentDate.getTime() - startDate.getTime(); // 时间差（毫秒）


    const ret = {
        "exceed_limit": timeDiff > timeLimit,
    };

    return ret;
}