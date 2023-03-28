<template>
  <div>
    <t-space direction="vertical">
      <t-tabs v-model="value">
        <t-tab-panel value="first" label="选项卡1" :destroyOnHide="false">
          <div style="margin: 10px">
            <t-space>
              <t-radio-group default-value="2">
                <t-radio-button value="1">选项一</t-radio-button>
                <t-radio-button value="2">选项二</t-radio-button>
                <t-radio-button value="3">选项三</t-radio-button>
                <t-radio-button value="4">选项四</t-radio-button>
              </t-radio-group>
              <t-button theme="primary">搜索</t-button>
            </t-space>
          </div>
        </t-tab-panel>
        <t-tab-panel value="second" label="选项卡2" :destroyOnHide="false">
          <p slot="panel" style="padding: 25px">
            <t-button variant="text" theme="primary">link to</t-button>
          </p>
        </t-tab-panel>
      </t-tabs>
      <t-space>
        <t-table
          rowKey="index"
          :data="data"
          :columns="columns"
          :bordered="false"
          :pagination="pagination"
        ></t-table>
      </t-space>
    </t-space>
  </div>
</template>

<script>
const data = [];
const total = 28;
for (let i = 0; i < total; i++) {
  data.push({
    index: i,
    platform: i % 2 === 0 ? "共有" : "私有",
    type: ["String", "Number", "Array", "Object"][i % 4],
    default: ["0", "[]"][i % 5],
    detail: {
      position: `读取 ${i} 个数据的嵌套信息值`,
    },
    needed: i % 4 === 0 ? "是" : "否",
    description: "数据源",
  });
}

export default {
  data() {
    return {
      value: "first",
      data,
      columns: [
        {
          colKey: "serial-number",
          title: "序号",
          width: "100",
          align: "center",
          attrs: {
            "data-id": "first-column",
            style: {},
          },
        },
        {
          width: 100,
          colKey: "platform",
          title: "平台",
        },
        {
          colKey: "type",
          title: "类型",
        },
        {
          colKey: "default",
          title: "默认值",
        },
        {
          colKey: "needed",
          title: "是否必传",
        },
        {
          colKey: "detail.position",
          title: "详情信息",
          width: 200,
          ellipsis: true,
          ellipsisTitle: false,

        },
      ],
      pagination: {
        defaultCurrent: 2,
        defaultPageSize: 5,
        total,
      },
    };
  },
};
</script>

<style></style>
