// 2021-11 Move all files using this file to start using src/js/common/utils/isMobileScreenSize
export default function isMobileScreenSize () {
  // console.log('window.screen.availWidth:', window.screen.availWidth);
  return (window.screen.availWidth < 500);
}
