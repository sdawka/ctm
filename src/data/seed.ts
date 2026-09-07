import {
  CausalConnection,
  Contributor,
  type NoteColor,
  Stage,
  TheoryNote,
  TheoryOfChangeCanvas,
} from '../domain/models'

const contributors = [
  new Contributor('lauren-hammond', 'Lauren Hammond'),
  new Contributor('maxime-ouellette', 'Maxime Ouellette'),
  new Contributor('ben', 'Ben'),
  new Contributor('workshop', 'Workshop participant'),
]

const stages = [
  new Stage('audience', 'Audience', 'Who participates, contributes, and benefits.', 0, 'green'),
  new Stage('activities', 'These Activities', 'What the community does and enables.', 1, 'yellow'),
  new Stage(
    'impact',
    'Intended Impact',
    'The immediate and intermediate changes we expect.',
    2,
    'purple',
  ),
  new Stage(
    'longterm',
    'Long-term Outcomes',
    'The sustained changes shared across activities.',
    3,
    'blue',
  ),
  new Stage(
    'ultimate',
    'Ultimate Outcome',
    'The future this chain exists to create.',
    4,
    'vision',
  ),
]

interface SeedNote {
  text: string
  color?: NoteColor
  author?: string
  review?: boolean
}

function notes(stageId: string, prefix: string, items: SeedNote[]): TheoryNote[] {
  const stage = stages.find((item) => item.id === stageId)
  if (!stage) throw new Error(`Unknown seed stage: ${stageId}`)
  return items.map(
    (item, index) =>
      new TheoryNote(
        `${prefix}${index + 1}`,
        stageId,
        item.text,
        item.author ?? 'workshop',
        item.color ?? stage.defaultColor,
        item.review ?? false,
      ),
  )
}

const audienceNotes = notes('audience', 'a', [
  {
    author: 'lauren-hammond',
    color: 'yellow',
    text: 'Tech contributors\nCommunity & civic actors\nNon-profits\nAcademics / researchers\nGeneral public (residents of MTL)\n\nPeople within the problem + people with tools and skills',
  },
  {
    author: 'maxime-ouellette',
    color: 'yellow',
    text: 'Public sector\nAcademia\nPrivate sector\nCitizens',
  },
])

const activityNotes = notes('activities', 'act', [
  {
    author: 'lauren-hammond',
    review: true,
    text: 'Skill-share events & functions and workshops by each project — different than lectures/talks\n\nProblem + speaking requirements pathway (this can help generate a pool of people that can build shared projects with a call out to help build)\n\nBuild days — working on projects\n\nSocial events / meetups (distinct from a build)',
  },
  {
    author: 'maxime-ouellette',
    text: 'Defining their problem in a sustainable and empowering way\n\nWorking with CTM to put together a solution to those problems\n\nHackathons',
  },
  { author: 'ben', color: 'blue', text: 'First-time members are given a simple next step / action for becoming more involved' },
  { author: 'ben', color: 'blue', text: 'An opt-in “buddy-led” system wherein new or less-engaged members have a direct, easy connection to the greater CivicTech community' },
  { author: 'ben', color: 'blue', text: 'Active recruitment in tech and non-tech spaces' },
  { author: 'ben', color: 'blue', text: 'Form and surface discoverable connections to other community groups (“Oh, we know someone working on that!”)' },
  { text: 'Town halls' },
  { text: 'Job fair or list of available work' },
  { text: 'Problem pools or lists with community problems' },
  { text: 'Connecting on problems' },
  { text: 'Speakers' },
  { text: 'Build days' },
  { color: 'teal', text: 'Hackathon' },
  { color: 'teal', text: 'Structuring and organizing' },
  { color: 'teal', text: 'Bilingual environment' },
  { color: 'teal', text: 'Finding interesting problems to work on' },
  { color: 'teal', text: 'Regular socials' },
  { color: 'purple', text: 'Skill-sharing days' },
  { color: 'purple', text: 'Workshops' },
  { color: 'purple', text: 'Ask and offer' },
  { color: 'purple', text: 'Mentor / buddy system for people' },
  { color: 'purple', text: 'Projects' },
  { color: 'blue', text: 'Post-event socials' },
  { color: 'blue', text: 'Spread networking' },
  { color: 'gray', text: 'Proactively meet others and create space' },
  { color: 'gray', text: 'Connect with community' },
  { color: 'orange', review: true, text: 'Organizers can own projects (like a way to get organized)' },
  { color: 'orange', text: 'Pizza' },
  { color: 'orange', review: true, text: 'Training for new organizers?' },
  { color: 'orange', text: 'Leadership is shared with the community' },
  { color: 'orange', text: 'Outreach and share the mission' },
  { color: 'orange', review: true, text: 'Organizer meetings as a way to set up?' },
  { color: 'orange', text: 'Organizing is sustainable so people can step in and out' },
  { color: 'orange', text: 'Leadership and organizers own the Theory of Change and refine it' },
  { color: 'orange', text: 'Information and leadership is documented well' },
])

const impactNotes = notes('impact', 'imp', [
  { author: 'lauren-hammond', color: 'yellow', text: 'Individuals and groups gain confidence to act and build independently' },
  { author: 'lauren-hammond', color: 'yellow', text: 'People who wouldn’t normally engage with “tech” spaces find an entry point' },
  { author: 'maxime-ouellette', color: 'yellow', text: 'Durable public service co-created' },
  { author: 'maxime-ouellette', color: 'yellow', text: 'Empowerment of the community to fight for good' },
  { author: 'lauren-hammond', color: 'yellow', review: true, text: 'Community members and non-tech individuals feel empowered to speak up and contribute to a build project—using non-tech skills and/or learning tech skills along the way' },
  { color: 'yellow', text: 'We have problems that people want to work on' },
  { color: 'yellow', text: 'We celebrate the connections that we make @ CTM' },
  { color: 'yellow', text: 'We show a visible and measurable impact' },
  { color: 'yellow', text: 'We form deeper long-term connections through CTM' },
  { color: 'yellow', text: 'Learners become teachers and share their knowledge' },
  { color: 'yellow', text: 'Learners invite other learners to join' },
  { color: 'yellow', review: true, text: 'Montreal’s tech-for-good community is built collectively' },
  { color: 'yellow', review: true, text: 'Accessibility / community for Montreal' },
  { color: 'yellow', text: 'Ambition matches resources' },
  { color: 'yellow', text: 'Limited barriers to organizing' },
  { color: 'yellow', text: 'Limited barriers to participating' },
  { color: 'yellow', review: true, text: 'Organizing shared based on capacity' },
  { color: 'yellow', text: 'Organizing is sustainable' },
])

const longTermNotes = notes('longterm', 'long', [
  { author: 'maxime-ouellette', color: 'yellow', review: true, text: 'Raise transparency in the organization' },
  { author: 'maxime-ouellette', color: 'yellow', text: 'Maximize inclusivity and participation of the tech community' },
  { author: 'maxime-ouellette', color: 'yellow', review: true, text: 'Help build a more sustainable civil society in Montreal' },
  { author: 'ben', color: 'blue', review: true, text: 'New members become engaged and frequently return to participate in activities / projects' },
  { author: 'ben', color: 'blue', review: true, text: 'Engaged members become project leads and organizers' },
  { author: 'ben', color: 'blue', text: 'It is simple to create new activities, projects, and gatherings—and there are more social and professional ties within the community' },
  { author: 'ben', color: 'blue', text: 'Projects raise the profile of the community and attract new members and participants' },
])

const ultimateNotes = notes('ultimate', 'ultimate', [
  { color: 'vision', text: 'We imagine a future where Civic Tech Montreal is a vibrant and diverse community garden that maximizes advocacy, accessibility, and agency to build in Montreal.' },
])

function edge(id: string, from: string, to: string, label: string): CausalConnection {
  return new CausalConnection(id, from, to, label)
}

const connections = [
  edge('e01', 'a1', 'act1', 'contribute skills through'),
  edge('e02', 'a1', 'act3', 'enter through'),
  edge('e03', 'a1', 'act5', 'are reached by'),
  edge('e04', 'a1', 'act6', 'connect through'),
  edge('e05', 'a2', 'act2', 'bring problems to'),
  edge('e06', 'a2', 'act7', 'deliberate in'),
  edge('e07', 'a2', 'act9', 'surface needs through'),
  edge('e08', 'act3', 'imp2', 'creates an entry point'),
  edge('e09', 'act4', 'imp5', 'builds confidence'),
  edge('e10', 'act5', 'imp2', 'widens participation'),
  edge('e11', 'act6', 'imp9', 'creates durable ties'),
  edge('e12', 'act7', 'imp4', 'builds collective agency'),
  edge('e13', 'act9', 'imp6', 'provides meaningful work'),
  edge('e14', 'act12', 'imp3', 'co-creates services'),
  edge('e15', 'act13', 'imp1', 'builds confidence to act'),
  edge('e16', 'act15', 'imp16', 'reduces participation barriers'),
  edge('e17', 'act18', 'imp10', 'turns learners into teachers'),
  edge('e18', 'act19', 'imp10', 'shares knowledge'),
  edge('e19', 'act20', 'imp7', 'celebrates exchange'),
  edge('e20', 'act21', 'imp5', 'supports new contributors'),
  edge('e21', 'act23', 'imp9', 'deepens social ties'),
  edge('e22', 'act25', 'imp2', 'creates welcoming space'),
  edge('e23', 'act29', 'imp10', 'develops organizers'),
  edge('e24', 'act30', 'imp4', 'distributes agency'),
  edge('e25', 'act31', 'imp11', 'invites new learners'),
  edge('e26', 'act33', 'imp18', 'sustains participation'),
  edge('e27', 'act34', 'imp8', 'aligns work to impact'),
  edge('e28', 'act35', 'imp14', 'matches ambition to capacity'),
  edge('e29', 'imp1', 'long5', 'develops leaders'),
  edge('e30', 'imp2', 'long4', 'grows recurring engagement'),
  edge('e31', 'imp3', 'long3', 'strengthens civil society'),
  edge('e32', 'imp4', 'long2', 'expands participation'),
  edge('e33', 'imp5', 'long2', 'makes inclusion real'),
  edge('e34', 'imp8', 'long7', 'raises community profile'),
  edge('e35', 'imp9', 'long6', 'creates social ties'),
  edge('e36', 'imp10', 'long5', 'creates future organizers'),
  edge('e37', 'imp11', 'long4', 'renews participation'),
  edge('e38', 'imp12', 'long2', 'builds an inclusive ecosystem'),
  edge('e39', 'imp14', 'long3', 'keeps work sustainable'),
  edge('e40', 'imp15', 'long5', 'lowers organizing barriers'),
  edge('e41', 'imp16', 'long4', 'lowers participation barriers'),
  edge('e42', 'imp18', 'long3', 'sustains civil society'),
  edge('e43', 'long1', 'ultimate1', 'supports accountable agency'),
  edge('e44', 'long2', 'ultimate1', 'creates diversity and access'),
  edge('e45', 'long3', 'ultimate1', 'sustains the community garden'),
  edge('e46', 'long4', 'ultimate1', 'keeps the community vibrant'),
  edge('e47', 'long5', 'ultimate1', 'distributes agency'),
  edge('e48', 'long6', 'ultimate1', 'grows community ties'),
  edge('e49', 'long7', 'ultimate1', 'builds advocacy and reach'),
]

export const seedCanvas = new TheoryOfChangeCanvas(
  'ctm-theory-of-change',
  'Civic Tech Montreal · Theory of Change',
  stages,
  contributors,
  [...audienceNotes, ...activityNotes, ...impactNotes, ...longTermNotes, ...ultimateNotes],
  connections,
)
