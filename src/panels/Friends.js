import React, {
    useEffect,
    useState,
} from 'react'

import PropTypes from 'prop-types'

import {
    Panel,
    PanelHeader,
    PanelHeaderClose,
    Placeholder,
    PanelSpinner,
    Search,
    PanelHeaderContent,
    Button,
} from '@vkontakte/vkui'

import {
    Icon56CheckCircleDeviceOutline,
} from '@vkontakte/icons'

import {
    showErrorSnackbar,
} from './_showSnackbar'

import UsersList from './_UsersList'

import bridge from '@vkontakte/vk-bridge'

function Friends({ id, go }) {
    const [snackbar, setSnackbar] = useState(null)
    const [friendsView, setFriendsView] = useState(null)

    useEffect(() => {
        const fetchFriends = async () => {
            let friend = null
            let isErrNotSupportedPlatform = false

            try {
                friend = (await bridge.send('VKWebAppGetFriends', { multi: false })).users[0]
            } catch (err) {
                switch (err.error_data.error_code) {
                    case 4:
                        go('home')
                        return
                    case 6:
                        isErrNotSupportedPlatform = true
                        break
                    default:
                        console.error(err)
                        showErrorSnackbar(setSnackbar, 'Не удалось открыть список друзей')
                        return
                }
            }

            if (friend == null && !isErrNotSupportedPlatform) {
                go('home')
                return
            }

            if (friend != null) {
                let fetchedFriend = null
                try {
                    let accessData = await bridge.send('VKWebAppGetAuthToken', { app_id: 7607943, scope: '' })
                    let users = (await bridge.send('VKWebAppCallAPIMethod', { method: 'users.get', params: { user_ids: friend.id, fields: 'photo_200,screen_name', v: '5.124', access_token: accessData.access_token } })).response
                    fetchedFriend = users[0]
                } catch (err) {
                    console.error(err)
                }

                go('profile', fetchedFriend ? fetchedFriend : friend)

                return
            }

            let accessData = null

            try {
                accessData = await bridge.send('VKWebAppGetAuthToken', { app_id: 7607943, scope: 'friends' })
            } catch (err) {
                if (err.error_data.error_code !== 4) {
                    console.error(err)
                    showErrorSnackbar(setSnackbar, 'Не удалось получить список друзей')
                    return
                }
            }

            if (accessData == null || accessData.scope.indexOf('friends') === -1) {
                setFriendsView(
                    <Placeholder
                        stretched
                        icon={<Icon56CheckCircleDeviceOutline />}
                        action={<Button onClick={() => {
                            fetchFriends()
                        }} size='l'>Хорошо</Button>}
                    >Для работы этой функции необходимо предоставить доступ к списку друзей.</Placeholder>
                )
                return
            }

            let friends = null

            setFriendsView(<PanelSpinner />)

            try {
                friends = (await bridge.send('VKWebAppCallAPIMethod', { method: 'friends.get', params: { order: 'name', fields: 'photo_200,screen_name', v: '5.124', access_token: accessData.access_token } })).response.items
            } catch (err) {
                console.error(err)
                showErrorSnackbar(setSnackbar, 'Не удалось получить список друзей')
                return
            }

            if (friends !== null) {
                setFriendsView(<FriendsDisplay go={go} setSnackbar={setSnackbar} accessToken={accessData.access_token} friends={friends} />)
            }
        }
        fetchFriends()
    }, [go])

    return (
        <Panel id={id}>
            <PanelHeader left={<PanelHeaderClose onClick={() => { go('home') }} />} separator={false}><PanelHeaderContent>Друзья</PanelHeaderContent></PanelHeader>

            {friendsView}

            {snackbar}
        </Panel>
    )
}

Friends.propTypes = {
    id: PropTypes.string,
    go: PropTypes.func,
}

function FriendsDisplay({ go, setSnackbar, accessToken, friends }) {
    let origFriendsCells = <UsersList go={go} users={friends} />

    const [friendsCells, setFriendsCells] = useState(origFriendsCells)

    return (
        <React.Fragment>
            <Search onChange={async function (event) {
                let userInput = event.target.value

                if (userInput === '') {
                    setFriendsCells(origFriendsCells)
                    return
                }

                let friendsSearch = null

                setFriendsCells(<PanelSpinner />)
                try {
                    friendsSearch = (await bridge.send('VKWebAppCallAPIMethod', { method: 'friends.search', params: { q: userInput, fields: 'photo_200,screen_name', v: '5.124', access_token: accessToken } })).response.items
                } catch (err) {
                    if (err.error_data.error_code !== 1) {
                        console.error(err)
                        showErrorSnackbar(setSnackbar, 'Не удалось выполнить поиск по друзьям')
                    }
                }

                if (friendsSearch == null) {
                    setFriendsCells(origFriendsCells)
                    return
                }

                if (friendsSearch.length === 0) {
                    setFriendsCells(<Placeholder>По вашему запросу не найдено ни одного друга</Placeholder>)
                    return
                }

                setFriendsCells(<UsersList go={go} users={friendsSearch} />)
            }} after={null} />

            {friendsCells}
        </React.Fragment>
    )
}

FriendsDisplay.propTypes = {
    go: PropTypes.func,
    setSnackbar: PropTypes.func,
    accessToken: PropTypes.string,
    friends: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number,
        screen_name: PropTypes.string,
        first_name: PropTypes.string,
        last_name: PropTypes.string,
        photo_200: PropTypes.string,
    }))
}

export default Friends
