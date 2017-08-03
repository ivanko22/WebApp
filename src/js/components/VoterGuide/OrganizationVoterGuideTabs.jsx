import React, { Component, PropTypes } from "react";
import GuideActions from "../../actions/GuideActions";
import GuideStore from "../../stores/GuideStore";
import LoadingWheel from "../LoadingWheel";
import VoterGuideFollowers from "./VoterGuideFollowers";
import VoterGuideFollowing from "./VoterGuideFollowing";
import VoterGuidePositions from "./VoterGuidePositions";
import VoterStore from "../../stores/VoterStore";
import { Tabs, Tab } from "react-bootstrap";


export default class OrganizationVoterGuideTabs extends Component {
  static propTypes = {
    organization: PropTypes.object.isRequired,
  };

  constructor (props) {
    super(props);
    this.state = {
      current_organization_we_vote_id: this.props.organization.organization_we_vote_id,
      organization: this.props.organization,
      voter_guide_followed_list: GuideStore.getVoterGuidesFollowedByLatestOrganization(),
      voter_guide_followers_list: GuideStore.getVoterGuidesFollowingLatestOrganization(),
    };
  }

  componentDidMount () {
    // console.log("OrganizationVoterGuideTabs, componentDidMount, organization: ", this.props.organization);
    this.guideStoreListener = GuideStore.addListener(this._onGuideStoreChange.bind(this));
    this._onVoterStoreChange();
    this.voterStoreListener = VoterStore.addListener(this._onVoterStoreChange.bind(this));
    GuideActions.voterGuidesFollowedByOrganizationRetrieve(this.props.organization.organization_we_vote_id);
    GuideActions.voterGuideFollowersRetrieve(this.props.organization.organization_we_vote_id);
  }

  componentWillReceiveProps (nextProps) {
    // When a new organization is passed in, update this component to show the new data
    if (nextProps.organization.organization_we_vote_id !== this.state.current_organization_we_vote_id) {
      GuideActions.voterGuidesFollowedByOrganizationRetrieve(nextProps.organization.organization_we_vote_id);
      GuideActions.voterGuideFollowersRetrieve(nextProps.organization.organization_we_vote_id);
      this.setState({
        current_organization_we_vote_id: nextProps.organization.organization_we_vote_id,
        organization: nextProps.organization,
      });
    }
  }

  componentWillUnmount (){
    this.guideStoreListener.remove();
    this.voterStoreListener.remove();
  }

  _onGuideStoreChange (){
    this.setState({
      voter_guide_followed_list: GuideStore.getVoterGuidesFollowedByLatestOrganization(),
      voter_guide_followers_list: GuideStore.getVoterGuidesFollowingLatestOrganization()
    });
  }

  _onVoterStoreChange () {
    this.setState({
      voter: VoterStore.getVoter()});
   }

  render () {
    if (!this.state.organization){
      return <div>{LoadingWheel}</div>;
    }

    let looking_at_self = false;
    if (this.state.voter) {
      looking_at_self = this.state.voter.linked_organization_we_vote_id === this.state.organization.organization_we_vote_id;
    }
    let positions_title = "";
    let following_title_long = "";
    let following_title_short = "";
    let followers_title = "";
    if (looking_at_self) {
      positions_title = "Your Positions";
      following_title_long = this.state.voter_guide_followed_list.length === 0 ?
        "You Are Following" : "You Are Following " + this.state.voter_guide_followed_list.length;
      following_title_short = "Following";
      followers_title = this.state.voter_guide_followers_list.length === 0 ?
        "Followers" : this.state.voter_guide_followers_list.length + " Followers";
    } else {
      positions_title = "Positions";
      following_title_long = this.state.voter_guide_followed_list.length === 0 ?
        "Following" : "Following " + this.state.voter_guide_followed_list.length;
      following_title_short = "Following";
      followers_title = this.state.voter_guide_followers_list.length === 0 ?
        "Followers" : this.state.voter_guide_followers_list.length + " Followers";
    }

    return (
      <Tabs defaultActiveKey={1} id="tabbed_voter_guide_details">
        <Tab eventKey={1} title={positions_title}>
          <VoterGuidePositions organization={this.state.organization} />
        </Tab>

        <Tab eventKey={2} title={<span><span className="hidden-xs">{following_title_long}</span><span className="visible-xs">{following_title_short}</span></span>}>
          <VoterGuideFollowing organization={this.state.organization} />
        </Tab>

        <Tab eventKey={3} title={followers_title}>
          <VoterGuideFollowers organization={this.state.organization} />
        </Tab>
      </Tabs>
    );
  }
}
