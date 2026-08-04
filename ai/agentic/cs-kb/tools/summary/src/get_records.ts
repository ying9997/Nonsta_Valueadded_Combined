async function main({params}: Args): Promise<Output> {

    const tenant_access_token = params.tenant_access_token;
    const table_id = 'tblLEgFazhddZOUT';
    const app_token = 'Oup1bQvrJabY24sOyphcQ0C1nic';
    const page_size = 200;

    var field_names = [
        'qid',
        'question',
        'sys_solution_final',
    ];

    const filter = {
        "conditions": [
            {
                "field_name": "sys_summary",
                "operator": "isEmpty",
                "value": [],
            }
        ],
        "conjunction": "and",
    };

    let response = await search_bitable_records(table_id, app_token, tenant_access_token, filter, field_names, page_size);


    var items = [];

    response.data.items.forEach(element => {
        var item = {
            "fields": {
                "qid": get_value(element.fields, 'qid'),
                "question": get_value(element.fields, 'question'),
                "sys_solution_final": get_value(element.fields, 'sys_solution_final'),
            },
            "record_id": element.record_id,
        };
        items.push(item);
    });

    const ret = {
        "items": items,
        "len": items.length,
    };

    return ret;
}

async function search_bitable_records(table_id:string, app_token:string, tenant_access_token:string, filter:any, field_names:any, page_size:number) {
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/search?page_size=${page_size}`;

    const headers = {
        'Authorization': `Bearer ${tenant_access_token}`,
        'Content-Type': 'application/json',
    };

    const body = {
        'filter': filter,
        'field_names': field_names,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
    });

    const response_body = await response.json();

    return response_body;
}

function get_value(obj, head): string {
    if (obj.hasOwnProperty(head)) {
        var obj_dialog = obj[head];
    
        if (Array.isArray(obj_dialog)) {
            var text = '';

            obj_dialog.forEach(element => {
                if(!element.hasOwnProperty('type')) {
                    throw new Error("格式错误");
                }

                var type = element['type'];

                switch(type) {
                    case 'text':
                        text += element['text'];
                        break;
                    case 'url':
                        if(element.hasOwnProperty('link')) {
                            var link = element['link'];
                            // var text_link = element['text'];
                            // text += `[${text_link}](${link})`;
                            text += `${link}`;
                        } else {
                            text += element['text'];
                        }
                        break;
                    case 'mention':
                        if(element.hasOwnProperty('link')) {
                            var link = element['link'];
                            text += `${link}`;
                        } else {
                            text += element['text'];
                        }
                        break;
                    default:
                        if (element.hasOwnProperty('text')) {
                            text += element['text'];
                        }
                        break;
                }
            
            });
            return text;
        } else if(typeof(obj_dialog)=='number'){
            return String(obj_dialog);
        } else if(typeof(obj_dialog)=='string'){
            return obj_dialog;
        }
    }
    return '';
}