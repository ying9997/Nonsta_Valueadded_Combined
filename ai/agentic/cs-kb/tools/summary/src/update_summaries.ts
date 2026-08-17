async function main({params}: Args): Promise<Output> {

    const tenant_access_token = params.tenant_access_token;
    const table_id = 'tblLEgFazhddZOUT';
    const app_token = 'Oup1bQvrJabY24sOyphcQ0C1nic';


    var items = params.items;
    const summaries = params.summaries;

    var records = [];
    var i = 0;

    for(var item of items) {
        var summary = '';
        if(summaries[i] && summaries[i]["summary"]) {
            summary = summaries[i]["summary"];
        }
        
        var record = {
            "fields": {
                "sys_summary": summary,
            },
            "record_id": item.record_id,
        };
        records.push(record);
        
        i++;
    }

    const response = await batch_update_bitable_records(tenant_access_token, records, app_token, table_id);
    const ret = {
        "response": response,
    };

    return ret;
}

async function batch_update_bitable_records(tenant_access_token: string, records: any[], app_token: string, table_id: string): Promise<any[]> {
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/batch_update`;
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
