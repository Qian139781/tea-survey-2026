// 云数据库配置（由 WorkBuddy 初始化）
window.SURVEY_CONFIG = {
  cloudBase: "https://extendsclass.com/api/json-storage/bin",
  indexBins: ["faceefc", "eccfcff", "cacccba", "ddefbfb", "bdbedfc", "cbdecee", "aecacaa", "fcfeaba"],
  adminHash: "60eb40e67796cab2005122c95929a2bb402ee50dfd4837c0858038e266ee5e86",
  // 填写 CloudBase 环境 ID 后，答卷将改存到腾讯云数据库；留空则继续使用上面的 JSON 存储
  cloudbaseEnv: "",
  cloudbaseCollection: "survey_responses",
  version: "V1.6"
};
