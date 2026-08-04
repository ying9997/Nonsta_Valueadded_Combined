async function main({params}: Args): Promise<Output> {
    // Configure lark_app_id and lark_app_secret as Coze workflow secret variables.
    const lark_app_id = params.lark_app_id;
    const lark_app_secret = params.lark_app_secret;
    if (!lark_app_id || !lark_app_secret) {
        throw new Error('lark_app_id and lark_app_secret are required workflow parameters');
    }

    const input = params.input;
    /* input is a string like "msg...., https://p3-bot-sign.byteimg.com/...xlsx..."
    we need to extract the url from the input
    */
    const url = input.match(/https?:\/\/[^\s]+/)[0];

    const tenant_access_token = await get_tenant_access_token(lark_app_id, lark_app_secret);

    const start_time = new Date().toISOString();

    const ret = {
        "tenant_access_token": tenant_access_token,
        "start_time": start_time,
        "url": url,
    };

    return ret;
}


async function get_tenant_access_token(app_id:string, app_secret:string) {
    const url = `https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal`;

    const headers = {
        'Content-Type': 'application/json',
    };

    const body = {
        'app_id': app_id,
        'app_secret': app_secret,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
    });

    const response_body = await response.json();

    return response_body.tenant_access_token;
}
