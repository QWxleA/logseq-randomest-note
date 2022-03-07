import '@logseq/libs'

const settingsTemplate = [
  {
    key: "includeJournals",
    type: 'boolean',
    default: false,
    title: "Include Journals?",
    description: "Check to include journals while you random walk through your Logseq notes.",
  }
]

logseq.useSettingsSchema(settingsTemplate)

async function openRandomNote() {
  var query = `
  [:find (pull ?p [*])
    :where
    [_ :block/page ?p]
    [?p :block/journal? false]]`
  if (logseq.settings.includeJournals) {
    query = `
    [:find (pull ?p [*])
      :where
      [_ :block/page ?p]]` 
  }
  try {
    let ret = await logseq.DB.datascriptQuery(query)
    const pages = ret?.flat()
    if(pages && pages.length > 0) {
      const index = Math.floor(Math.random() * pages.length)
      logseq.App.pushState('page', {
        name: pages[index].name
      })
    }
  } catch (err) {
    console.log(err)
  }
}

function main() {

  const doc = document

  logseq.provideModel({
    openSettingPanel (e) {
      const { rect } = e
      logseq.setMainUIInlineStyle({
        top: `${rect.top + 25}px`,
        left: `${rect.right - 17}px`,
      })
      logseq.toggleMainUI()
    },
    handleRandomNote() {
      openRandomNote()
    }
  },
)

  logseq.provideStyle(`
  .logseq-random-note-toolbar .ti-dice {
    font-size: 208px;
    color: green;
  }
  `);

  logseq.setMainUIInlineStyle({
    position: "fixed",
    width: '200px',
  });

  logseq.App.registerUIItem("toolbar", {
    key: 'logseq-random-note-toolbar',
    template: `
      <span class="logseq-random-note-toolbar flex flex-row">
        <a title="I'm Feeling Lucky" class="button" data-on-click="handleRandomNote">
          <i class="ti ti-dice"></i>
        </a>
      </span>
    `,
  });
}

logseq.ready(main).catch(console.error)
