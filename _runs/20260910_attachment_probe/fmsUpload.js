
+function($,win) {
    
    function upload(params){
        var setting = $.extend({
            // file: fileObject,
            // locationName:locationName,
            // success: function(res){},
            locationName:GlobalData.fmsLocationName,//默认上传目录
            error: function(data) {
                bootbox.alert(data.code);
            },
          }, params);
          if(!setting.locationName){    
            bootbox.alert('locationName不能为空,请设置fms文件上传目录');
          }
          $.Deferred().resolve().then(function(){
              var promise = $.Deferred();
              $.ajax({
                  type: 'POST',
                  url: GlobalData.url+'/getFmsAuthorization',
                  data: {
                          locationName:setting.locationName,
                  }
              }).then(function(res){
                  promise.resolve(res);
              });
              return promise;
          }).then(function(res){
              var promise = $.Deferred();
              var fd = new FormData();
              fd.append('file', setting.file);
              fd.append('locationName', setting.locationName);
              $.ajax({
                  type: 'POST',
                  url: GlobalData.fms+'/upload',
                  data: fd,
                  processData: false,
                  contentType: false,
                  cache: false,
                  headers: {
                      'platform': 'fms',
                      'user': GlobalData.fmsUser,
                      'version': 'V1.0',
                      'Authorization': res.info.sign,
                      'signDate': res.info.time
                  }
              }).then(function(data) {
                  if(data.code !=0){
                    setting.error && setting.error(data); 
                    return false;
                  }
                  promise.resolve(data);
              },function(res){
                bootbox.alert('status:'+res.status+',statusText:'+res.statusText);
              })
              return promise;
          }).then(function(res){
              $.ajax({
                  type: 'POST',
                  url: GlobalData.url+'/getFmsImageToken',
                  data: {
                          objectURI:res.data.objectURI,
                  },
                  success:function(data){
                    setting.success && setting.success($.extend(res,{
                        fileToken:data,
                        fileName:setting.file.name,
                    }));
                  }
              })
          })
    }
    
    //方法注册
    win.fms = {
        upload:upload,
    };
}(jQuery,window)