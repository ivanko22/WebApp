import { Close } from '@mui/icons-material';
import { Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import withTheme from '@mui/styles/withTheme';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import React, { Component, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { isAndroid, isAndroidSizeWide, isIOS, isIOsSmallerThanPlus, isIPhone5p5inEarly, isIPhone5p5inMini, isIPhone5p8in, isIPhone6p1in, isIPhone6p5in, isWebAppHeight0to568, isWebAppHeight569to667, isWebAppHeight668to736, isWebAppHeight737to896, restoreStylesAfterCordovaKeyboard } from '../../common/utils/cordovaUtils';
import historyPush from '../../common/utils/historyPush';
import { isCordova, isWebApp } from '../../common/utils/isCordovaOrWebApp';
import { renderLog } from '../../common/utils/logging';
import stringContains from '../../common/utils/stringContains';
import webAppConfig from '../../config';
import VoterStore from '../../stores/VoterStore';
import initializeAppleSDK from '../../utils/initializeAppleSDK';
import initializeFacebookSDK from '../../utils/initializeFacebookSDK';
import signInModalGlobalState from '../../common/components/Widgets/signInModalGlobalState';
import DeviceURLField from './DeviceURLField';

const SignInOptionsPanel = React.lazy(() => import(/* webpackChunkName: 'SignInOptionsPanel' */ '../../common/components/SignIn/SignInOptionsPanel'));


/* global $ */

class SignInModalOriginal extends Component {
  constructor (props) {
    super(props);
    this.state = {
      focusedOnSingleInputToggle: false,
    };
    signInModalGlobalState.set('textOrEmailSignInInProcess', false);
  }

  componentDidMount () {
    window.scrollTo(0, 0);
    this.onVoterStoreChange();
    this.voterStoreListener = VoterStore.addListener(this.onVoterStoreChange.bind(this));
    const { FB, AppleID } = window;
    if (!FB) {
      initializeFacebookSDK();
    }
    if (!AppleID) {
      initializeAppleSDK();
    }
  }

  componentDidUpdate () {
    window.scrollTo(0, 0);
    if (isIOS()) {
      // Cordova really has trouble with animations on dialogs, while the visible area is being compressed to fit the software keyboard
      // eslint-disable-next-line func-names
      $('*').each(function () {
        const styleWorking = $(this).attr('style');
        if (styleWorking && stringContains('transition', styleWorking)) {
          console.log(`SignInModal componentDidUpdate transition style removed before: ${styleWorking}`);
          const cleaned = styleWorking.replace(/transition.*?;/, '');
          $(this).attr('style', cleaned);
        }
      });
    }
  }

  componentDidCatch (error, info) {
    // We should get this information to Splunk!
    console.error('SignInModalOriginal caught error: ', `${error} with info: `, info);
  }

  componentWillUnmount () {
    // console.log('SignInModalOriginal componentWillUnmount');
    signInModalGlobalState.set('textOrEmailSignInInProcess', false);
    // April 2021: Firing off the verification action, also fires off a number of just in case actions,
    // that causes problems here.  So remove the listener before the "changed state while dispatching" trouble happens.
    this.voterStoreListener.remove();
  }

  // See https://reactjs.org/docs/error-boundaries.html
  static getDerivedStateFromError (error) { // eslint-disable-line no-unused-vars
    // Update state so the next render will show the fallback UI, We should have a "Oh snap" page
    return { hasError: true };
  }

  onVoterStoreChange () {
    const secretCodeVerificationStatus = VoterStore.getSecretCodeVerificationStatus();
    const { secretCodeVerified } = secretCodeVerificationStatus;
    if (secretCodeVerified) {
      if (isWebApp()) {
        // In Cordova something else has already closed the dialog, so this has to be suppressed to avoid an error -- Jan 27, 2020 is this still needed?
        this.props.closeFunction();
        // this.voterStoreListener.remove();
      }
    } else {
      const voter = VoterStore.getVoter();
      this.setState({
        voter,
        voterIsSignedIn: voter.is_signed_in,
      });
    }
  }

  focusedOnSingleInputToggle = (focusedInputName) => {
    const { focusedOnSingleInputToggle } = this.state;
    // console.log('focusedInputName:', focusedInputName);
    const incomingInputName = focusedInputName === 'email' ? 'email' : 'phone';
    this.setState({
      focusedInputName: incomingInputName,
      focusedOnSingleInputToggle: !focusedOnSingleInputToggle,
    });
  };

  closeFunction = () => {
    // console.log('SignInModalOriginal closeFunction');
    signInModalGlobalState.set('textOrEmailSignInInProcess', false);

    if (this.props.closeFunction) {
      this.props.closeFunction();
    }

    if (isCordova()) {
      // console.log('closeFunction in SignInModalOriginal doing restoreStylesAfterCordovaKeyboard and historyPush');
      restoreStylesAfterCordovaKeyboard('SignInModalOriginal');
      if (webAppConfig.SHOW_CORDOVA_URL_FIELD) {   // TODO This is a hack, need to pass back the new path from DeviceURLField
        historyPush('/start');
      } else {
        historyPush('/ballot');
      }
    }
  };

  onKeyDown = (event) => {
    event.preventDefault();
    // const ENTER_KEY_CODE = 13;
    // const enterAndReturnKeyCodes = [ENTER_KEY_CODE];
    // if (enterAndReturnKeyCodes.includes(event.keyCode)) {
    //   this.closeFunction();
    // }
  };

  render () {
    renderLog('SignInModalOriginal');  // Set LOG_RENDER_EVENTS to log all renders
    const { classes } = this.props;
    const { focusedInputName, focusedOnSingleInputToggle, voter, voterIsSignedIn } = this.state;

    if (!voter) {
      // console.log('SignInModalOriginal render voter NOT found');
      return <div className="undefined-props" />;
    }
    // console.log('SignInModalOriginal render voter found');

    if (voter && voterIsSignedIn && isCordova()) {
      return false;
    }

    // This modal is shown when the voter wants to sign in.
    // console.log('window.screen.height:', window.screen.height);
    return (
      <Dialog
        id="signInModalDialog"
        classes={{
          paper: clsx(classes.dialogPaper, {
            [classes.focusedOnSingleInput]: focusedOnSingleInputToggle,
            // iPhone 5 / SE
            [classes.emailInputWebApp0to568]: isWebAppHeight0to568() && focusedOnSingleInputToggle && focusedInputName === 'email',
            [classes.phoneInputWebApp0to568]: isWebAppHeight0to568() && focusedOnSingleInputToggle && focusedInputName === 'phone',
            // iPhone6/7/8, iPhone8Plus
            [classes.emailInputWebApp569to736]: (isWebAppHeight569to667() || isWebAppHeight668to736()) && focusedOnSingleInputToggle && focusedInputName === 'email',
            [classes.phoneInputWebApp569to736]: (isWebAppHeight569to667() || isWebAppHeight668to736()) && focusedOnSingleInputToggle && focusedInputName === 'phone',
            // iPhoneX/iPhone11 Pro Max
            [classes.emailInputWebApp737to896]: isWebAppHeight737to896() && focusedOnSingleInputToggle && focusedInputName === 'email',
            [classes.phoneInputWebApp737to896]: isWebAppHeight737to896() && focusedOnSingleInputToggle && focusedInputName === 'phone',
            [classes.signInModalDialogLarger]: (isIPhone5p5inEarly() || isIPhone5p5inMini() || isIPhone5p8in() || isIPhone6p1in() || isIPhone6p5in()) && isCordova(),
            [classes.signInModalDialogAndroid]: isAndroid(),
          }),
          root: classes.dialogRoot,
        }}
        open={this.props.show}
        onClose={() => { this.closeFunction(); }}
        style={{ paddingTop: `${isCordova() ? '75px' : 'undefined'}` }}
      >
        <DialogTitle>
          <Typography className="text-center">
            <span className="h2">Sign In or Sign Up</span>
          </Typography>
          <IconButton
            aria-label="Close"
            classes={{ root: classes.closeButton }}
            onClick={() => { this.closeFunction(); }}
            id="profileCloseSignInModal"
            size="large"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent classes={{ root: classes.dialogContent }}>
          <section>
            <div className="text-center">
              {voter && voterIsSignedIn ? (
                <div>
                  <div className="u-f2">You are signed in.</div>
                </div>
              ) : (
                <div>
                  <Suspense fallback={<></>}>
                    <SignInOptionsPanel
                      closeSignInModal={this.closeFunction}
                      focusedOnSingleInputToggle={this.focusedOnSingleInputToggle}
                      inModal
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </section>
          {isCordova() && (
            <div className="text-center">
              <span id="termsAndPrivacySignInModal" className="terms-and-privacy">
                <Link to="/privacy" onClick={this.closeFunction}>
                  <span className="u-no-break" style={{ color: 'black', textDecoration: 'underline' }}>Privacy Policy</span>
                </Link>
                <span style={{ paddingLeft: 20 }} />
                <Link to="/more/terms" onClick={this.closeFunction}>
                  <span className="u-no-break" style={{ color: 'black', textDecoration: 'underline' }}>Terms of Service</span>
                </Link>
                {webAppConfig.SHOW_CORDOVA_URL_FIELD && (
                  <>
                    <span style={{ paddingLeft: 20 }} />
                    <DeviceURLField closeFunction={this.closeFunction} />
                  </>
                )}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }
}
SignInModalOriginal.propTypes = {
  classes: PropTypes.object,
  show: PropTypes.bool,
  closeFunction: PropTypes.func.isRequired,
};

/*
This modal dialog floats up in the DOM, to just below the body, so no styles from the app are inherited.
In Cordova, when you click into a text entry field, the phone OS reduces the size of the JavaScript DOM by
the size of the keyboard, and if the DOM is overconstrained, i.e  has hard coded vertical sizes that can't
be honored, Cordova tries to do the best it can, but sometimes it crashes and locks up the instance.
For Cordova eliminate as many fixed vertical dimensions as needed to avoid overconstraint.
*/
const styles = (theme) => ({
  dialogRoot: isWebApp() ? {
    height: '100%',
    // position: 'absolute !important', // Causes problem on Firefox
    top: '-15%',
    left: '0% !important',
    right: 'unset !important',
    bottom: 'unset !important',
    width: '100%',
    zIndex: '9010 !important',
  } : {
    height: '100%',
    position: 'absolute !important',
    top: isIOsSmallerThanPlus() ? '16% !important' : '6% !important',
    left: '0% !important',
    right: 'unset !important',
    bottom: 'unset !important',
    width: '100%',
    // zIndex: '9010 !important',
  },
  dialogPaper: isWebApp() ? {
    minWidth: '55%',
    [theme.breakpoints.down('lg')]: {
      minWidth: '65%',
    },
    [theme.breakpoints.down('md')]: {
      minWidth: '75%',
    },
    [theme.breakpoints.down('sm')]: {
      minWidth: '95%',
      maxWidth: '95%',
      width: '95%',
      maxHeight: '90%',
      height: 'unset',
      margin: '0 auto',
    },
  } : {
    margin: '0 !important',
    width: '95%',
    maxWidth: '95%',
    height: 'unset',
    maxHeight: '90%',
    offsetHeight: 'unset !important',
    top: () => {
      if (isAndroidSizeWide()) return '15%';
      if (isCordova()) return '7%';
      return '50%';
    },
    bottom: 'unset !important',
    position: 'absolute',
  },
  focusedOnSingleInput: isWebApp() ? {
    [theme.breakpoints.down('sm')]: {
      transform: 'translate(0, -50%)',
    },
  } : {},
  emailInputWebApp0to568: {
    [theme.breakpoints.down('sm')]: {
      transform: 'translate(-75%, -50%)',
    },
  },
  phoneInputWebApp0to568: {
    [theme.breakpoints.down('sm')]: {
      transform: 'translate(-75%, -60%)',
    },
  },
  emailInputWebApp569to736: {
    [theme.breakpoints.down('sm')]: {
      transform: 'translate(-75%, -55%)',
    },
  },
  phoneInputWebApp569to736: {
    [theme.breakpoints.down('sm')]: {
      transform: 'translate(-75%, -55%)',
    },
  },
  emailInputWebApp737to896: {
    [theme.breakpoints.down('sm')]: {
      transform: 'translate(-75%, -40%)',
    },
  },
  phoneInputWebApp737to896: {
    [theme.breakpoints.down('sm')]: {
      transform: 'translate(-75%, -55%)',
    },
  },
  signInModalDialogAndroid: {
    transform: isAndroid() ? 'none' : 'translate(-50%, -60%)',
  },
  signInModalDialogLarger: {
    bottom: 'unset',
    top: isCordova() ? '6%' : '180px',
  },
  dialogContent: {
    [theme.breakpoints.down('md')]: {
      padding: '0 8px 8px',
    },
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
  },
});


export default withTheme(withStyles(styles)(SignInModalOriginal));
