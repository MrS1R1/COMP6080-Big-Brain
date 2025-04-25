import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, Space, Tag, Typography, message, Progress, Modal } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import http from '../../utils/request';

const { Header } = Layout;
const { Title, Text } = Typography;

export default function GameManagement() {
    const [game, setGame] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [gameStatus, setGameStatus] = useState('waiting');
    const [activeSession, setActiveSession] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const params = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        fetchGame();
    }, [params.game_id]);

    const fetchCorrectAnswer = async () => {
        try {
            if (!currentQuestion) return;
            const response = await http.get('/admin/games');
            if (response && response.games) {
                const currentGame = response.games.find(g => String(g.id) === String(params.game_id));
                if (currentGame && currentGame.questions) {
                    const question = currentGame.questions.find(q => q.id === currentQuestion.id);
                    if (question && question.correctAnswers) {
                        setCurrentQuestion(prev => ({
                            ...prev,
                            correctAnswers: question.correctAnswers
                        }));
                    }
                }
            }
        } catch (error) {
            message.error('Failed to get correct answer');
        }
    };

    // Countdown effect
    useEffect(() => {
        let timer;
        if (gameStatus === 'playing' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setShowAnswer(true);
                        fetchCorrectAnswer();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [gameStatus, timeLeft, currentQuestion, params.game_id]);

    const fetchGame = async () => {
        try {
            const response = await http.get('/admin/games');
            if (response && response.games) {
                const currentGame = response.games.find(g => String(g.id) === String(params.game_id));
                if (currentGame) {
                    setGame(currentGame);
                    setQuestions(currentGame.questions || []);
                    setActiveSession(currentGame.active);
                    if (currentGame.active !== null) {
                        setGameStatus('playing');
                        if (currentGame.position !== undefined && currentGame.questions && currentGame.questions.length > 0) {
                            setCurrentQuestion(currentGame.questions[currentGame.position]);
                        } else {
                            setCurrentQuestion(null);
                        }
                    } else {
                        setGameStatus('waiting');
                        setCurrentQuestion(null);
                    }
                } else {
                    message.error('Game does not exist');
                    navigate('/dashboard');
                }
            }
        } catch (error) {
            message.error('Failed to get game information');
        }
    };

    const handleGameMutation = async (mutationType) => {
        try {
            if (mutationType === 'ADVANCE' && currentQuestion) {
                const currentIndex = questions.findIndex(q => q.id === currentQuestion.id);
                if (currentIndex === questions.length - 1) {
                    message.warning('This is the last question, please click End Game');
                    return;
                }
            }

            const response = await http.post(`/admin/game/${params.game_id}/mutate`, {
                mutationType
            });

            // Update state based on different operation types
            switch (mutationType) {
                case 'START':
                    if (response.data && response.data.sessionId) {
                        setGameStatus('playing');
                        setActiveSession(response.data.sessionId);
                        // Prepare first question
                        if (questions.length > 0) {
                            const firstQuestion = questions[0];
                            setCurrentQuestion(firstQuestion);
                            setTimeLeft(firstQuestion.time);
                            setShowAnswer(false);
                        }
                        message.success('Game started');
                    }
                    break;

                case 'ADVANCE':
                    if (!currentQuestion) {
                        const firstQuestion = questions[0];
                        setCurrentQuestion(firstQuestion);
                        setTimeLeft(firstQuestion.time);
                        setShowAnswer(false);
                        setGameStatus('playing');
                    } else {
                        const currentIndex = questions.findIndex(q => q.id === currentQuestion.id);
                        const nextIndex = currentIndex + 1;
                        if (nextIndex < questions.length) {
                            const nextQuestion = questions[nextIndex];
                            setCurrentQuestion(nextQuestion);
                            setTimeLeft(nextQuestion.time);
                            setShowAnswer(false);
                        }
                    }
                    message.success('Moved to next question');
                    break;

                case 'END':
                    try {
                        if (gameStatus !== 'playing') {
                            message.error('Game is not in progress, cannot end');
                            return;
                        }

                        // Use session ID from current state
                        let sessionId = activeSession;
                        
                        if (!sessionId && sessionId !== 0) {
                            // If not in state, try to get it again
                            const gameResponse = await http.get('/admin/games');
                            const currentGame = gameResponse.games.find(g => String(g.id) === String(params.game_id));
                            
                            if (!currentGame) {
                                message.error('Cannot find current game');
                                return;
                            }

                            sessionId = currentGame.active;

                            if (!sessionId && sessionId !== 0) {
                                message.error('No active session for current game');
                                return;
                            }
                        }

                        // Ensure sessionId is string type
                        const sessionIdStr = String(sessionId);

                        // Show confirmation dialog for user choice
                        Modal.confirm({
                            title: 'End Game',
                            content: 'Game is about to end, do you want to view the results or return to dashboard?',
                            okText: 'View Results',
                            cancelText: 'Return to Dashboard',
                            onOk: async () => {
                                try {
                                    // End game
                                    await http.post(`/admin/game/${params.game_id}/mutate`, {
                                        mutationType: 'END'
                                    });
                                    
                                    // Wait a short time to ensure session state is updated
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    
                                    // Verify if session has ended
                                    const statusResponse = await http.get(`/admin/session/${sessionIdStr}/status`);
                                    if (!statusResponse.results.active) {
                                        setGameStatus('waiting');
                                        setActiveSession(null);
                                        setCurrentQuestion(null);
                                        setTimeLeft(0);
                                        setShowAnswer(false);
                                        // Jump to results page
                                        navigate(`/session/${sessionIdStr}`);
                                    } else {
                                        message.error('Failed to end game, please try again');
                                    }
                                } catch (error) {
                                    message.error('Operation failed, please try again');
                                }
                            },
                            onCancel: async () => {
                                try {
                                    // End game
                                    await http.post(`/admin/game/${params.game_id}/mutate`, {
                                        mutationType: 'END'
                                    });
                                    
                                    // Wait a short time to ensure session state is updated
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    
                                    // Verify if session has ended
                                    const statusResponse = await http.get(`/admin/session/${sessionIdStr}/status`);
                                    if (!statusResponse.results.active) {
                                        setGameStatus('waiting');
                                        setActiveSession(null);
                                        setCurrentQuestion(null);
                                        setTimeLeft(0);
                                        setShowAnswer(false);
                                        // Return to dashboard
                                        navigate('/dashboard');
                                    } else {
                                        message.error('Failed to end game, please try again');
                                    }
                                } catch (error) {
                                    message.error('Operation failed, please try again');
                                }
                            },
                            closable: true,
                            maskClosable: false
                        });
                    } catch (error) {
                        message.error('Operation failed, please try again');
                    }
                    break;
                default:
                    break;
            }
        } catch (error) {
            if (error.response?.status === 400) {
                switch (mutationType) {
                    case 'ADVANCE':
                        message.error('Cannot move to next question: game may not have started or has ended');
                        break;
                    case 'END':
                        message.error('Cannot end game: game may not have started');
                        break;
                    default:
                        message.error('Operation failed');
                }
            } else {
                message.error('Operation failed');
            }
        }
    };

    const renderQuestion = () => {
        if (!currentQuestion) return null;

        return (
            <div style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '8px' }}>
                    <Text type="secondary">Current Question: {currentQuestion.title}</Text>
                </div>
                <div style={{ marginBottom: '8px' }}>
                    <Progress 
                        percent={Math.round((timeLeft / currentQuestion.time) * 100)} 
                        status={timeLeft === 0 ? 'exception' : 'active'}
                        format={() => `${timeLeft} seconds`}
                    />
                </div>
                {showAnswer && currentQuestion.correctAnswers && (
                    <div style={{ marginTop: '16px', padding: '16px', background: '#f6ffed', borderRadius: '4px' }}>
                        <Text strong>Correct Answer: </Text>
                        <Text type="success">
                            {Array.isArray(currentQuestion.correctAnswers) 
                                ? currentQuestion.correctAnswers.join(', ') 
                                : currentQuestion.correctAnswers}
                        </Text>
                    </div>
                )}
            </div>
        );
    };

    if (!game) {
        return <div>Loading...</div>;
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: '#fff',
                padding: '0 24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: 0,
                zIndex: 1,
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px',
                    flexWrap: 'wrap'
                }}>
                    <Title level={3} style={{ margin: 0, color: '#1890ff' }}>{game.name}</Title>
                    <Tag color={
                        gameStatus === 'playing' ? 'success' :
                        gameStatus === 'ended' ? 'default' : 'processing'
                    }>
                        {gameStatus === 'playing' ? 'In Progress' :
                         gameStatus === 'ended' ? 'Ended' : 'Not Started'}
                    </Tag>
                </div>
                <Space wrap>
                    <Button onClick={() => navigate(`/game/${params.game_id}`)}>
                        Edit Game
                    </Button>
                    <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                </Space>
            </Header>
            <div style={{ 
                padding: '24px',
                background: '#f0f2f5',
                minHeight: 'calc(100vh - 64px)'
            }}>
                <div style={{ 
                    maxWidth: '1200px', 
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
                    gap: '24px'
                }}>
                    <Card 
                        title="Game Control" 
                        style={{ 
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '16px',
                                background: '#fafafa',
                                borderRadius: '4px',
                                flexWrap: 'wrap',
                                gap: '16px'
                            }}>
                                <Text strong>Game Status</Text>
                                <Space wrap>
                                    <Button 
                                        type="primary"
                                        onClick={() => handleGameMutation('ADVANCE')}
                                        disabled={gameStatus !== 'playing'}
                                    >
                                        Next Question
                                    </Button>
                                    <Button 
                                        type="primary"
                                        danger 
                                        onClick={() => handleGameMutation('END')}
                                        disabled={gameStatus !== 'playing'}
                                    >
                                        End Game
                                    </Button>
                                </Space>
                            </div>
                            {renderQuestion()}
                        </Space>
                    </Card>

                    <Card 
                        title="Question List" 
                        style={{ 
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {questions.map(question => (
                                <Card 
                                    key={question.id} 
                                    style={{ 
                                        marginBottom: '16px',
                                        borderColor: currentQuestion?.id === question.id ? '#52c41a' : undefined,
                                        backgroundColor: currentQuestion?.id === question.id ? '#f6ffed' : undefined,
                                        borderRadius: '4px',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'flex-start',
                                        flexWrap: 'wrap',
                                        gap: '16px'
                                    }}>
                                        <div style={{ flex: 1, minWidth: '250px' }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px', 
                                                marginBottom: '8px',
                                                flexWrap: 'wrap'
                                            }}>
                                                <Title level={4} style={{ margin: 0 }}>{question.title}</Title>
                                                {currentQuestion?.id === question.id && (
                                                    <Tag color="success">Current Question</Tag>
                                                )}
                                            </div>
                                            {question.description && (
                                                <Text style={{ 
                                                    display: 'block', 
                                                    marginBottom: '8px',
                                                    wordBreak: 'break-word'
                                                }}>
                                                    {question.description}
                                                </Text>
                                            )}
                                            <Text type="secondary">Answer time: {question.time} seconds</Text>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </Space>
                    </Card>
                </div>
            </div>
        </Layout>
    );
} 