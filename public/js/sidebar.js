// Handle skel click to show envs
$('.skel-title').on('click', function() {
  var $target = $(this).next('.skel-details');
  var $parentTarg = $target.parent();
  $target.slideToggle('fast');

  $parentTarg.toggleClass('active');
  $('.active').not($parentTarg).removeClass('active');
  $('.skel-details').not($target).slideUp('fast');
});

// Hover events for styling
$('.btn').on('mouseover focus', function(){
    $(this).parent().siblings('.environment').addClass('active');
});
$('.btn').on('mouseleave focusout', function(){
    $(this).parent().siblings('.environment').removeClass('active');
});

// Handle deployment modals
$('.deploy-button').on('click', function() {
  var skel = $(this).data('skel'),
      env = $(this).data('env'),
      deploy_url = '/deploy/' + skel + '/' + env;
  AP.require('user', function(user){
     user.getCurrentUser(function(err, data){
        openDeployModal(skel, env, deploy_url, data.name);
     });
  });
});

// Open deploy modal
function openDeployModal(skel, env, deploy_url, user) {
  AP.require('dialog', function(dialog) {
    dialog.open({
      key: "hipchat-deploybot-addon.deploy-dialog",
      options: {
        title: skel + " Deployment Options"
      },
      parameters: {
        skel: skel,
        env: env,
        deploy_url: deploy_url,
        user: user
      }
    });
  });
}
