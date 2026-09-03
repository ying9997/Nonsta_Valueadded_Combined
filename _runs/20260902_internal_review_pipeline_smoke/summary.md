# 内部审核 Copilot 本地干跑报告

- 输入文件：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260901_oms_facts\details.json`
- 样本数：183
- 链路：validate-input → context-bind → check-requirement → match-template → check-completeness → format-output
- SOP：本地 mock，未调用真实 LLM，未拉实时 OMS

## 分流统计

| outputPath | count |
| --- | ---: |
| needs_field_clarification | 31 |
| needs_requirement_clarification | 140 |
| transfer_human | 12 |

## 失败归因

| gate | count |
| --- | ---: |
| check-completeness | 31 |
| check-requirement | 140 |
| match-template | 12 |

## 明细

| orderNo | outputPath | 命中节点 | 缺失项 |
| --- | --- | --- | --- |
| VASC000000344421 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000343821 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000342681 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000335325 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000334098 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000333237 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000333147 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000332922 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000332907 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000332778 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000328776 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000327963 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系；标签文件 |
| VASC000000327915 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系；标签文件 |
| VASC000000326061 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000324960 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000323808 | transfer_human | match-template | - |
| VASC000000323364 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000321243 | needs_requirement_clarification | check-requirement | 数量或范围；具体操作动作 |
| VASC000000321231 | needs_requirement_clarification | check-requirement | 数量或范围；具体操作动作 |
| VASC000000321210 | needs_requirement_clarification | check-requirement | 数量或范围；具体操作动作 |
| VASC000000319377 | needs_requirement_clarification | check-requirement | 数量或范围；具体操作动作 |
| VASC000000319344 | needs_requirement_clarification | check-requirement | 数量或范围；具体操作动作 |
| VASC000000319107 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000317712 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系；标签文件 |
| VASC000000314100 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000313455 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000311247 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000303444 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000297120 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000297108 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000292350 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000292200 | needs_field_clarification | check-completeness | 商品和标签的对应关系 |
| VASC000000287082 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000274815 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000271086 | needs_field_clarification | check-completeness | 商品和标签的对应关系 |
| VASC000000270696 | needs_requirement_clarification | check-requirement | 具体操作动作 |
| VASC000000268050 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000266361 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000266172 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000266130 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000264651 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000264570 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000264231 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000263310 | needs_requirement_clarification | check-requirement | 数量或范围；具体操作动作 |
| VASC000000263154 | needs_field_clarification | check-completeness | 操作说明附件 |
| VASC000000261318 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000261039 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000260853 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000260625 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000260013 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000259068 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000259017 | needs_requirement_clarification | check-requirement | 具体操作动作 |
| VASC000000258807 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000258777 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000258558 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000258396 | transfer_human | match-template | - |
| VASC000000258255 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000258147 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000258141 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000258138 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000258099 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000257811 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000257757 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000257703 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000256728 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000255099 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000254946 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000254673 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000252804 | transfer_human | match-template | - |
| VASC000000252771 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000252732 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000252453 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000252450 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000252150 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000252096 | needs_requirement_clarification | check-requirement | 具体操作动作 |
| VASC000000252093 | needs_requirement_clarification | check-requirement | 具体操作动作 |
| VASC000000251757 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000251655 | transfer_human | match-template | - |
| VASC000000250131 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000250023 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000249768 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000248964 | needs_requirement_clarification | check-requirement | 数量或范围；具体操作动作 |
| VASC000000245433 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000243336 | transfer_human | match-template | - |
| VASC000000238794 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000238566 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000238314 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000237105 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000236637 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000235602 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000234306 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000233931 | transfer_human | match-template | - |
| VASC000000233913 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系；标签文件 |
| VASC000000233796 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000230394 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000230325 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000230139 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000229869 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000229200 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000228717 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000228642 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000227499 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000227100 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000225987 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000222774 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000221928 | needs_requirement_clarification | check-requirement | 操作对象；数量或范围；对象对应关系 |
| VASC000000220968 | transfer_human | match-template | - |
| VASC000000220863 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000220281 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000219891 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000219711 | needs_field_clarification | check-completeness | 操作说明附件 |
| VASC000000219615 | needs_requirement_clarification | check-requirement | 数量或范围；具体操作动作 |
| VASC000000219603 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000219477 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000218982 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000218202 | needs_requirement_clarification | check-requirement | 数量或范围；具体操作动作 |
| VASC000000217233 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000210468 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000210348 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000210168 | transfer_human | match-template | - |
| VASC000000207243 | needs_field_clarification | check-completeness | 商品和标签的对应关系 |
| VASC000000206277 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000206079 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000205086 | needs_requirement_clarification | check-requirement | 具体操作动作 |
| VASC000000204201 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000201993 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000201501 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000199962 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000198612 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000195966 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000195762 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000195270 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000195255 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000194691 | needs_field_clarification | check-completeness | 商品和标签的对应关系 |
| VASC000000194442 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000193236 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000192933 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000192930 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000192927 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000192858 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000192834 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000192822 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000192111 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000192087 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000192075 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000191976 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000191946 | needs_requirement_clarification | check-requirement | 数量或范围；具体操作动作 |
| VASC000000191247 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000191241 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000190644 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000190569 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000190365 | needs_requirement_clarification | check-requirement | 具体操作动作 |
| VASC000000189465 | needs_requirement_clarification | check-requirement | 操作对象；数量或范围 |
| VASC000000186117 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000184941 | needs_field_clarification | check-completeness | 标签文件 |
| VASC000000183069 | needs_requirement_clarification | check-requirement | 操作对象；数量或范围；具体操作动作；处理结果或去向 |
| VASC000000181545 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000180960 | needs_field_clarification | check-completeness | 操作说明附件；标签文件 |
| VASC000000177207 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系；标签文件 |
| VASC000000170973 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000170208 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000164445 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000160065 | transfer_human | match-template | - |
| VASC000000160059 | transfer_human | match-template | - |
| VASC000000155625 | transfer_human | match-template | - |
| VASC000000151410 | needs_requirement_clarification | check-requirement | 操作对象；数量或范围；具体操作动作 |
| VASC000000145012 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000144469 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000143515 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000142705 | needs_field_clarification | check-completeness | 操作说明附件 |
| VASC000000141793 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000140869 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000140461 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000140068 | needs_field_clarification | check-completeness | 操作说明附件 |
| VASC000000138394 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000133996 | transfer_human | match-template | - |
| VASC000000133114 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系；标签文件 |
| VASC000000126004 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000086761 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000080416 | needs_requirement_clarification | check-requirement | 对象对应关系 |
| VASC000000071863 | needs_requirement_clarification | check-requirement | 数量或范围；对象对应关系 |
| VASC000000069385 | needs_requirement_clarification | check-requirement | 处理结果或去向 |
| VASC000000063397 | needs_requirement_clarification | check-requirement | 数量或范围 |
